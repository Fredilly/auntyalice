import LoginForm from "./login-form";

export default function StaffLogin() {
  return (
    <div className="staff-login">
      <h1>Sign in to the teacher workspace</h1>
      <p>Use your invited staff account.</p>
      <LoginForm />
    </div>
  );
}
