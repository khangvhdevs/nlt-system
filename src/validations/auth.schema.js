import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .nonempty({ message: 'Email không được để trống' })
    .refine(val => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val), {
      message: 'Email không đúng định dạng'
    }),
  password: z
    .string()
    .min(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
    .max(15, { message: 'Mật khẩu không được vượt quá 15 ký tự' })
});

export const changePasswordSchema = z.object({
  oldPassword: z
    .string()
    .nonempty({ message: 'Mật khẩu cũ không được để trống' }),
  newPassword: z
    .string()
    .min(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
    .max(15, { message: 'Mật khẩu mới không được vượt quá 15 ký tự' })
});
