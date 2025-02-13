import { LoginButton } from "./components/LoginButton";
import { useAuth } from "react-oidc-context";

const tokenStyles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "80%",
    padding: "16px",
    backgroundColor: "#f5f5f5",
    borderRadius: "8px",
    margin: "10px 0",
  },
  pre: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    overflowX: "auto",
    fontFamily: "monospace",
    fontSize: "14px",
    margin: 0,
  },
};

const TokenDisplay: React.FC<{ token: string }> = ({ token }) => {
  return (
    <div style={tokenStyles.container}>
      <pre style={tokenStyles.pre}>{token}</pre>
    </div>
  );
};

function App() {
  const auth = useAuth();

  return (
    <div>
      <h1>SSO Demo</h1>
      <h2>Refresh Token: </h2>
      {auth.user?.refresh_token ? (
        <TokenDisplay token={auth.user.refresh_token} />
      ) : null}
      <h2>Access Token: </h2>
      {auth.user?.access_token ? (
        <TokenDisplay token={auth.user.access_token} />
      ) : null}
      <LoginButton />
    </div>
  );
}

export default App;
