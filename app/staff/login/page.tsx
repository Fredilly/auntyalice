import { connection } from "next/server";
import { staffDevIdentityEnabled } from "../../lib/identity.mjs";
import SessionButton from "./session-button";

export default async function StaffLogin() {
  await connection();

  return (
    <div className="staff-login">
      <h1>Sign in to the teacher workspace</h1>
      <p>{staffDevIdentityEnabled
        ? "Development sign-in uses the configured staff subject."
        : "Sign in through Cloudflare Access with your invited staff account, then continue to the workspace."}</p>
      <SessionButton development={staffDevIdentityEnabled} />
    </div>
  );
}
