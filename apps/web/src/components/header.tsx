import { NavLink, useNavigate } from "react-router"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/Button"
import { ModeToggle } from "./mode-toggle"

export default function Header() {
  const { data: session } = authClient.useSession()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          navigate("/login", { replace: true })
          toast.success("Signed out")
        },
      },
    })
  }

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-4 py-2">
        <nav className="flex items-center gap-6">
          <span className="font-semibold text-primary">MediaMind</span>
          {session && (
            <>
              <NavLink
                to="/upload"
                className={({ isActive }) =>
                  `text-sm ${isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`
                }
              >
                Upload
              </NavLink>
              <NavLink
                to="/queue"
                className={({ isActive }) =>
                  `text-sm ${isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`
                }
              >
                Queue
              </NavLink>
              <NavLink
                to="/billing"
                className={({ isActive }) =>
                  `text-sm ${isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`
                }
              >
                Billing
              </NavLink>
            </>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <ModeToggle />
          {session && (
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sign out
            </Button>
          )}
        </div>
      </div>
      <hr className="border-border" />
    </div>
  )
}
