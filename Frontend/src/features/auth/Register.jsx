import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../../store/auth.store';
import useAuthForm from '../../hooks/useAuthForm';
import AuthLayout from './components/AuthLayout';
import FormField from './components/FormField';
import { ROUTES } from '../../utils/constants';
import { isValidEmail, isStrongPassword, isRequired } from '../../utils/helpers';

// ─── Validation ────────────────────────────────────────────────────────────────

const validate = (values) => {
  const errors = {};

  if (!isRequired(values.name)) {
    errors.name = 'Họ tên là bắt buộc.';
  } else if (values.name.trim().length < 2) {
    errors.name = 'Họ tên tối thiểu 2 ký tự.';
  }

  if (!isRequired(values.email)) {
    errors.email = 'Email là bắt buộc.';
  } else if (!isValidEmail(values.email)) {
    errors.email = 'Email không hợp lệ.';
  }

  if (!isRequired(values.password)) {
    errors.password = 'Mật khẩu là bắt buộc.';
  } else if (!isStrongPassword(values.password)) {
    errors.password =
      'Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số.';
  }

  if (!isRequired(values.confirmPassword)) {
    errors.confirmPassword = 'Vui lòng xác nhận mật khẩu.';
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
  }

  return errors;
};

// ─── Component ─────────────────────────────────────────────────────────────────

const Register = () => {
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState('');

  const register = useAuthStore((state) => state.register);
  const storeError = useAuthStore((state) => state.error);
  const loading = useAuthStore((state) => state.loading);

  const handleSubmit = async (values) => {
    const result = await register({
      name: values.name.trim(),
      email: values.email.trim(),
      password: values.password,
      confirmPassword: values.confirmPassword,
    });

    if (result.success) {
      setSuccessMessage(
        result.message ||
          'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.'
      );
    }
  };

  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit: onSubmit,
  } = useAuthForm(
    { name: '', email: '', password: '', confirmPassword: '' },
    validate,
    handleSubmit
  );

  const isLoading = loading || isSubmitting;

  // Sau khi đăng ký thành công → hiện thông báo, không cần form nữa
  if (successMessage) {
    return (
      <AuthLayout title="Đăng ký thành công!">
        <div className="alert alert--success">{successMessage}</div>
        <button
          className="btn btn--primary btn--full"
          style={{ marginTop: '1rem' }}
          onClick={() =>
            navigate(ROUTES.LOGIN, {
              state: { message: 'Hãy đăng nhập sau khi xác thực email.' },
            })
          }
        >
          Về trang đăng nhập
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Tạo tài khoản"
      footerText="Đã có tài khoản?"
      footerLink={ROUTES.LOGIN}
      footerLinkText="Đăng nhập"
    >
      {storeError && (
        <div className="alert alert--error" role="alert">
          {storeError}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <FormField
          label="Họ và tên"
          name="name"
          type="text"
          value={values.name}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.name}
          touched={touched.name}
          placeholder="Nguyễn Văn A"
          autoComplete="name"
          disabled={isLoading}
        />

        <FormField
          label="Email"
          name="email"
          type="email"
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.email}
          touched={touched.email}
          placeholder="you@example.com"
          autoComplete="email"
          disabled={isLoading}
        />

        <FormField
          label="Mật khẩu"
          name="password"
          type="password"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.password}
          touched={touched.password}
          placeholder="Tối thiểu 8 ký tự"
          autoComplete="new-password"
          disabled={isLoading}
        />

        <FormField
          label="Xác nhận mật khẩu"
          name="confirmPassword"
          type="password"
          value={values.confirmPassword}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.confirmPassword}
          touched={touched.confirmPassword}
          placeholder="Nhập lại mật khẩu"
          autoComplete="new-password"
          disabled={isLoading}
        />

        <button
          type="submit"
          className="btn btn--primary btn--full"
          disabled={isLoading}
        >
          {isLoading ? 'Đang đăng ký...' : 'Đăng ký'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default Register;
