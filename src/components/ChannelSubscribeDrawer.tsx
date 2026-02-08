import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import coinImg from "@/assets/coin-3d.png";
import megaphoneIcon from "@/assets/megaphone-icon.png";
import { toast } from "sonner";

interface ChannelSubscribeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  channel: {
    id: string;
    name: string;
    username: string;
    reward: number;
  } | null;
  isCompleted: boolean;
  invokeAction: (action: string, params?: Record<string, any>) => Promise<any>;
  onSuccess: (channelId: string, coinsEarned: number) => void;
}

const ChannelSubscribeDrawer = ({
  isOpen,
  onClose,
  channel,
  isCompleted,
  invokeAction,
  onSuccess,
}: ChannelSubscribeDrawerProps) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleGoToChannel = () => {
    if (!channel) return;
    const tg = (window as any).Telegram?.WebApp;
    const cleanUsername = channel.username.replace("@", "");
    if (tg) {
      tg.openTelegramLink(`https://t.me/${cleanUsername}`);
    } else {
      window.open(`https://t.me/${cleanUsername}`, "_blank");
    }
  };

  const handleVerify = async () => {
    if (!channel || isVerifying || completed || isCompleted) return;
    setIsVerifying(true);

    try {
      const result = await invokeAction("subscribe_channel", { channel_id: channel.id });

      if (result?.success) {
        setCompleted(true);
        toast.success(`+${result.coins_earned} tanga olindi! 🎉`);
        onSuccess(channel.id, result.coins_earned);
        // Auto close after success
        setTimeout(() => {
          onClose();
          setCompleted(false);
        }, 1500);
      } else if (result?.need_subscribe) {
        toast.error("Kanalga obuna bo'lmagansiz! Avval kanalga obuna bo'ling.");
      } else {
        toast.error(result?.error || "Xatolik yuz berdi");
      }
    } catch (error) {
      toast.error("Tekshirishda xatolik");
    } finally {
      setIsVerifying(false);
    }
  };

  const isDone = completed || isCompleted;

  return (
    <AnimatePresence>
      {isOpen && channel && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl z-50 shadow-2xl max-w-md mx-auto"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="px-5 pb-8">
              {/* Header */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-purple-50 flex items-center justify-center">
                  <img src={megaphoneIcon} alt="Kanal" className="w-11 h-11 object-contain" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-foreground">Kanalga qo'shilish</h3>
                  <p className="text-sm text-muted-foreground">{channel.username}</p>
                </div>
              </div>

              {/* Reward display */}
              <div className="flex items-center justify-center gap-3 mb-5">
                <img src={coinImg} alt="coin" className="w-10 h-10" />
                <p className="text-3xl font-extrabold text-coin">{channel.reward} Tanga</p>
              </div>

              {/* Info text */}
              <div className="bg-muted/50 rounded-2xl p-4 mb-5 text-center">
                <p className="text-sm text-muted-foreground">
                  📢 Kanalga obuna bo'lib, tekshirish tugmasini bosing.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Telegram ID orqali obuna tekshiriladi.
                </p>
              </div>

              {/* Buttons */}
              {isDone ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-full py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2"
                  style={{
                    background: "hsl(var(--success))",
                    color: "hsl(var(--success-foreground))",
                  }}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Bajarildi!
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {/* Go to channel button */}
                  <button
                    onClick={handleGoToChannel}
                    className="w-full py-4 rounded-2xl text-base font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]"
                    style={{
                      background: "var(--gradient-primary)",
                      color: "hsl(var(--primary-foreground))",
                      boxShadow: "0 6px 20px hsla(215, 90%, 55%, 0.35)",
                    }}
                  >
                    <Bell className="w-5 h-5" />
                    Kanalga o'tish
                  </button>

                  {/* Verify button */}
                  <button
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="w-full py-4 rounded-2xl text-base font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
                    style={{
                      background: "linear-gradient(135deg, hsl(250, 80%, 60%), hsl(270, 75%, 55%))",
                      color: "white",
                      boxShadow: "0 6px 20px hsla(260, 80%, 55%, 0.35)",
                    }}
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Tekshirilmoqda...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        Tekshirish
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChannelSubscribeDrawer;
