import { useAuth } from "react-oidc-context";

export const LoginButton = () => {
  const auth = useAuth();

  if (auth.isLoading) {
    return <div>Đang tải...</div>;
  }

  if (auth.error) {
    return <div>Lỗi: {auth.error.message}</div>;
  }

  if (auth.isAuthenticated) {
    return (
      <div>
        <p>Xin chào {auth.user?.profile.preferred_username}</p>
        <div><pre>{JSON.stringify(auth.user?.profile, null, 2)}</pre></div>
        <button
          onClick={() => {
            auth.signoutRedirect({
              post_logout_redirect_uri: window.location.origin,
            });
          }}
        >
          Đăng xuất
        </button>
      </div>
    );
  }

  return <button onClick={() => auth.signinRedirect()}>Đăng nhập</button>;
};
