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

            <div className="px-4 pb-5 max-h-[70vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-purple-50 flex items-center justify-center flex-shrink-0">
                  <img src={megaphoneIcon} alt="Kanal" className="w-8 h-8 object-contain" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-foreground">Kanalga qo'shilish</h3>
                  <p className="text-xs text-muted-foreground">{channel.username}</p>
                </div>
              </div>

              {/* Reward display */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <img src={coinImg} alt="coin" className="w-8 h-8" />
                <p className="text-2xl font-extrabold text-coin">{channel.reward} Tanga</p>
              </div>

              {/* Info text */}
              <div className="bg-muted/50 rounded-xl p-3 mb-4 text-center">
                <p className="text-xs text-muted-foreground">
                  📢 Kanalga obuna bo'lib, tekshirish tugmasini bosing.
                </p>
              </div>

              {/* Buttons */}
              {isDone ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                  style={{
                    background: "hsl(var(--success))",
                    color: "hsl(var(--success-foreground))",
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Bajarildi!
                </motion.div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={handleGoToChannel}
                    className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]"
                    style={{
                      background: "var(--gradient-primary)",
                      color: "hsl(var(--primary-foreground))",
                      boxShadow: "0 4px 14px hsla(215, 90%, 55%, 0.3)",
                    }}
                  >
                    <Bell className="w-4 h-4" />
                    Kanalga o'tish
                  </button>

                  <button
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
                    style={{
                      background: "linear-gradient(135deg, hsl(250, 80%, 60%), hsl(270, 75%, 55%))",
                      color: "white",
                      boxShadow: "0 4px 14px hsla(260, 80%, 55%, 0.3)",
                    }}
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Tekshirilmoqda...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
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
