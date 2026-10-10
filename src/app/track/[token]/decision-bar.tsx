"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { formatTHB } from "@/domain/money";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { decideQuoteByToken } from "./actions";

/**
 * Sticky bottom bar shown only while the latest quote is PENDING and the job is QUOTED.
 * Receives no job id — only the token, the rendered revision and the total to display.
 */
export function DecisionBar({
  token,
  revision,
  total,
}: {
  token: string;
  revision: number;
  total: number;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function decide(decision: "APPROVE" | "REJECT") {
    start(async () => {
      const result = await decideQuoteByToken(token, decision, revision);
      if (result.ok) {
        toast.success(
          decision === "APPROVE"
            ? "อนุมัติใบเสนอราคาแล้ว ขอบคุณค่ะ"
            : "บันทึกการปฏิเสธแล้ว ร้านจะติดต่อกลับ",
        );
        setConfirmOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="track-bar">
      <button
        type="button"
        className="btn btn-secondary btn-lg"
        disabled={pending}
        onClick={() => setConfirmOpen(true)}
      >
        <ThumbsDown size={18} aria-hidden /> ปฏิเสธ
      </button>
      <button
        type="button"
        className="btn btn-primary btn-lg"
        disabled={pending}
        onClick={() => decide("APPROVE")}
      >
        <ThumbsUp size={18} aria-hidden /> อนุมัติ {formatTHB(total)}
      </button>
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => !open && setConfirmOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ปฏิเสธใบเสนอราคา?</DialogTitle>
            <DialogDescription>
              ร้านจะติดต่อคุณเพื่อเสนอราคาใหม่ หรือยกเลิกงานและคืนเครื่อง
              (อาจมีค่าตรวจเช็ค)
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={pending}
              onClick={() => setConfirmOpen(false)}
            >
              กลับ
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={pending}
              onClick={() => decide("REJECT")}
            >
              ยืนยันปฏิเสธ
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
