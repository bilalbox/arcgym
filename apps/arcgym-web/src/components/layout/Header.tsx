import { Cloud, Moon, Sun, User } from "lucide-react";
import type React from "react";
import { useTheme } from "@/hooks/useTheme";

interface HeaderProps {
	pathname: string;
	navigate: (to: string) => void;
	totalCompleted?: number;
	totalDrillsCount?: number;
	streakDays?: number;
	isStreakEarnedToday?: boolean;
	totalPoints?: number;
	isAuthenticated?: boolean;
	isSyncing?: boolean;
	isTrialExhausted?: boolean;
	onSignIn?: () => void;
	onOpenProgressModal: () => void;
}

const chipClass =
	"inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full border border-miro-hairline bg-miro-card text-miro-slate text-xs font-medium transition-colors";

export const Header: React.FC<HeaderProps> = ({
	pathname,
	navigate,
	totalCompleted: _totalCompleted,
	totalDrillsCount: _totalDrillsCount,
	streakDays: _streakDays,
	isStreakEarnedToday: _isStreakEarnedToday = false,
	totalPoints: _totalPoints = 0,
	isAuthenticated = false,
	isSyncing = false,
	isTrialExhausted: _isTrialExhausted = false,
	onSignIn,
	onOpenProgressModal,
}) => {
	const isStudio =
		pathname === "/dev/drills" || pathname.startsWith("/dev/drills/");
	const { resolved, toggle } = useTheme();

	return (
		<header className="sticky top-0 z-40 w-full border-b border-miro-hairline bg-miro-card/95 backdrop-blur-sm">
			<div className="max-w-4xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
				<div className="flex items-center gap-3">
					{/* Brand Logo */}
					<button
						type="button"
						onClick={() => navigate("/")}
						className="flex items-center gap-2 group text-left cursor-pointer"
						aria-label="ArcGym home"
					>
						<div
							aria-hidden="true"
							className="h-7 w-7 rounded-full bg-miro-primary flex items-center justify-center text-miro-onPrimary font-medium text-[11px] tracking-tight group-hover:bg-miro-charcoal transition-colors"
						>
							AG
						</div>
						<span className="font-medium text-miro-primary tracking-tight text-base">
							Arc<span className="text-miro-blue">Gym</span>
						</span>
					</button>

					{import.meta.env.DEV && (
						<button
							type="button"
							onClick={() => navigate("/dev/drills")}
							className={`inline-flex items-center px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
								isStudio
									? "bg-miro-primary text-miro-onPrimary font-medium"
									: "text-miro-muted hover:text-miro-primary"
							}`}
						>
							Studio
						</button>
					)}
				</div>

				{/* Right Utility Controls */}
				<div className="flex items-center gap-2 sm:gap-2.5">
					{/* Account & Settings Pill Trigger */}
					{isAuthenticated ? (
						<button
							type="button"
							onClick={onOpenProgressModal}
							className={`${chipClass} hover:bg-miro-surfaceSoft hover:border-miro-hairlineStrong cursor-pointer text-miro-successText flex items-center gap-1.5`}
							title={
								isSyncing
									? "Syncing telemetry..."
									: "Cloud synced · Account & Settings"
							}
						>
							<Cloud
								className={`h-3.5 w-3.5 ${isSyncing ? "animate-pulse" : ""}`}
							/>
							<span className="hidden sm:inline font-medium">Account</span>
						</button>
					) : (
						<button
							type="button"
							onClick={onOpenProgressModal || onSignIn}
							className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer bg-miro-primary text-miro-onPrimary hover:bg-miro-charcoal"
							title="Sign in to save streak and practice"
						>
							<User className="h-3 w-3" />
							<span>Sign in</span>
						</button>
					)}

					{/* Theme switcher */}
					<button
						type="button"
						onClick={toggle}
						className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-miro-hairline bg-miro-card text-miro-slate hover:border-miro-hairlineStrong hover:text-miro-primary transition-colors cursor-pointer"
						aria-label={
							resolved === "dark"
								? "Switch to light mode"
								: "Switch to dark mode"
						}
						title={
							resolved === "dark"
								? "Switch to light mode"
								: "Switch to dark mode"
						}
					>
						{resolved === "dark" ? (
							<Sun className="h-3.5 w-3.5" aria-hidden="true" />
						) : (
							<Moon className="h-3.5 w-3.5" aria-hidden="true" />
						)}
					</button>
				</div>
			</div>
		</header>
	);
};
