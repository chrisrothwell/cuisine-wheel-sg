import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Compass, Users, MapPin, User, LogOut, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface CyberpunkLayoutProps {
  children: React.ReactNode;
}

export default function CyberpunkLayout({ children }: CyberpunkLayoutProps) {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const logoutMutation = trpc.auth.logout.useMutation();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      toast.success("Logged out successfully");
      window.location.href = "/";
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  const navItems = [
    { path: "/", label: "Home", icon: Sparkles },
    { path: "/discover", label: "Discover", icon: Compass },
    { path: "/groups", label: "Groups", icon: Users },
    { path: "/map", label: "Map", icon: MapPin },
    { path: "/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Cyberpunk header with neon accents */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/">
              <div className="flex items-center gap-3 cursor-pointer group">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center neon-border-pink">
                  <Sparkles className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold neon-pink tracking-wider">CUISINE WHEEL</h1>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">Singapore</p>
                </div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                return (
                  <Link key={item.path} href={item.path}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={`gap-2 ${isActive ? "neon-border-pink" : ""}`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>

            {/* Auth Section */}
            <div className="flex items-center gap-3">
              {isAuthenticated && user ? (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold neon-cyan">{user.name || "User"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => window.location.href = getLoginUrl()}
                  className="gap-2 neon-border-cyan"
                >
                  <User className="w-4 h-4" />
                  Login
                </Button>
              )}
            </div>
          </div>

          {/* Mobile Navigation */}
          <nav className="md:hidden flex items-center gap-1 pb-3 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              return (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={`gap-2 whitespace-nowrap ${isActive ? "neon-border-pink" : ""}`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>

      {/* Cyberpunk footer */}
      <footer className="border-t border-border bg-card/30 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <p className="text-sm text-muted-foreground">
                Explore cuisines from around the world in Singapore
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                © 2026 Cuisine Wheel Singapore. All rights reserved.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground uppercase tracking-widest">
                Powered by <span className="neon-pink">Neon Tech</span>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
