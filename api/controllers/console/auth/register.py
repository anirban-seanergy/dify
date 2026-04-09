import re

from flask import make_response, request
from flask_restx import Resource
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select

from configs import dify_config
from controllers.console import console_ns
from controllers.console.auth.error import UsernameAlreadyExistsError
from controllers.console.error import AccountInFreezeError
from controllers.console.wraps import (
    email_password_login_enabled,
    setup_required,
)
from extensions.ext_database import db
from libs.helper import extract_remote_ip
from models import Account
from services.account_service import AccountService
from services.billing_service import BillingService
from services.errors.account import AccountRegisterError

DEFAULT_REF_TEMPLATE_SWAGGER_2_0 = "#/definitions/{model}"


class UsernameRegisterPayload(BaseModel):
    username: str = Field(..., min_length=2, max_length=64, description="Username (2-64 chars)")
    name: str = Field(..., min_length=1, max_length=64, description="Display name")

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_]+$", value):
            raise ValueError("Username can only contain letters, numbers, and underscores")
        return value


console_ns.schema_model(
    UsernameRegisterPayload.__name__,
    UsernameRegisterPayload.model_json_schema(ref_template=DEFAULT_REF_TEMPLATE_SWAGGER_2_0),
)


@console_ns.route("/register")
class UsernameRegisterApi(Resource):
    @setup_required
    @email_password_login_enabled
    @console_ns.expect(console_ns.models[UsernameRegisterPayload.__name__])
    def post(self):
        args = UsernameRegisterPayload.model_validate(console_ns.payload)

        existing = db.session.scalar(select(Account).where(Account.username == args.username).limit(1))
        if existing:
            raise UsernameAlreadyExistsError()

        if dify_config.BILLING_ENABLED and BillingService.is_email_in_freeze(f"{args.username}@placeholder.local"):
            raise AccountInFreezeError()

        try:
            account = AccountService.create_account_and_tenant(
                email=f"{args.username}@placeholder.local",
                name=args.name,
                username=args.username,
                password=args.username,
                interface_language="en-US",
                password_initial=True,
            )
        except AccountRegisterError:
            raise AccountInFreezeError()

        token_pair = AccountService.login(account=account, ip_address=extract_remote_ip(request))
        response = make_response({"result": "success", "data": token_pair.model_dump()})

        from libs.token import (
            set_access_token_to_cookie,
            set_csrf_token_to_cookie,
            set_refresh_token_to_cookie,
        )

        set_access_token_to_cookie(request, response, token_pair.access_token)
        set_refresh_token_to_cookie(request, response, token_pair.refresh_token)
        set_csrf_token_to_cookie(request, response, token_pair.csrf_token)

        return response