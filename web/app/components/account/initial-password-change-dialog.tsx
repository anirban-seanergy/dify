'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/app/components/base/button'
import Input from '@/app/components/base/input'
import { Dialog, DialogContent } from '@/app/components/base/ui/dialog'
import { toast } from '@/app/components/base/ui/toast'
import { validPassword } from '@/config'
import { useGlobalPublicStore } from '@/context/global-public-context'
import { updateUserProfile } from '@/service/common'
import { commonQueryKeys, useUserProfile } from '@/service/use-common'

const titleClassName = `
  system-sm-semibold text-text-secondary
`

/**
 * Blocks the console with a password form when the API marks the account with password_initial
 * (e.g. after certain registrations). Dismisses after a successful password update.
 */
export default function InitialPasswordChangeDialog() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { systemFeatures } = useGlobalPublicStore()
  const { data: userProfileResp } = useUserProfile()
  const userProfile = userProfileResp?.profile

  const [editing, setEditing] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const open = Boolean(
    userProfile?.password_initial && systemFeatures.enable_email_password_login,
  )

  const mutateUserProfile = () => queryClient.invalidateQueries({ queryKey: commonQueryKeys.userProfile })

  const resetPasswordForm = () => {
    setCurrentPassword('')
    setPassword('')
    setConfirmPassword('')
  }

  const showErrorMessage = (message: string) => {
    toast.error(message)
  }

  const valid = () => {
    if (!password.trim()) {
      showErrorMessage(t('error.passwordEmpty', { ns: 'login' }))
      return false
    }
    if (!validPassword.test(password)) {
      showErrorMessage(t('error.passwordInvalid', { ns: 'login' }))
      return false
    }
    if (password !== confirmPassword) {
      showErrorMessage(t('account.notEqual', { ns: 'common' }))
      return false
    }
    return true
  }

  const handleSavePassword = async () => {
    if (!userProfile || !valid())
      return
    try {
      setEditing(true)
      await updateUserProfile({
        url: 'account/password',
        body: {
          password: currentPassword,
          new_password: password,
          repeat_new_password: confirmPassword,
        },
      })
      toast.success(t('actionMsg.modifiedSuccessfully', { ns: 'common' }))
      mutateUserProfile()
      resetPasswordForm()
    }
    catch (e) {
      toast.error((e as Error).message)
    }
    finally {
      setEditing(false)
    }
  }

  if (!systemFeatures.enable_email_password_login || !userProfile)
    return null

  return (
    <Dialog open={open}>
      <DialogContent className="w-[420px]! p-6!">
        <div className="mb-6 title-2xl-semi-bold text-text-primary">
          {t('account.changePasswordRequired', { ns: 'common' })}
        </div>
        <p className="mb-4 body-xs-regular text-text-tertiary">
          {t('account.changePasswordRequiredTip', { ns: 'common' })}
        </p>
        {userProfile.is_password_set && (
          <>
            <div className={titleClassName}>{t('account.currentPassword', { ns: 'common' })}</div>
            <div className="relative mt-2">
              <Input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 flex items-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? '👀' : '😝'}
                </Button>
              </div>
            </div>
          </>
        )}
        <div className="mt-8 system-sm-semibold text-text-secondary">
          {userProfile.is_password_set ? t('account.newPassword', { ns: 'common' }) : t('account.password', { ns: 'common' })}
        </div>
        <div className="relative mt-2">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <div className="absolute inset-y-0 right-0 flex items-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? '👀' : '😝'}
            </Button>
          </div>
        </div>
        <div className="mt-8 system-sm-semibold text-text-secondary">{t('account.confirmPassword', { ns: 'common' })}</div>
        <div className="relative mt-2">
          <Input
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
          />
          <div className="absolute inset-y-0 right-0 flex items-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? '👀' : '😝'}
            </Button>
          </div>
        </div>
        <div className="mt-10 flex justify-end">
          <Button
            disabled={editing}
            variant="primary"
            onClick={handleSavePassword}
          >
            {userProfile.is_password_set ? t('operation.reset', { ns: 'common' }) : t('operation.save', { ns: 'common' })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
