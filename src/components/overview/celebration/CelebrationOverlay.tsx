"use client";

import { useEffect, useRef, useState } from "react";
import { onRealtimeEvent, type StatusCelebration } from "@/lib/realtime";
import { AnimatedNotification } from "./AnimatedNotification";
import {
  BottomLeftBlock,
  BottomRightBlock,
  RightMiddleBlock,
  TopLeftBlock,
  TopMiddleBlock,
  TopRightBlock,
} from "./NotificationAnimationBlocks";

/**
 * Full-screen "task completed / in review" celebration, ported from
 * baboons-dashboard (app/team/page.tsx). Listens for `status_celebration`
 * realtime events and runs the exact sequence: a short delay, the status video,
 * then the blurred backdrop with the animated card and the corner blocks
 * transitioning in, before tearing everything down.
 *
 * Mount it on the Overview page — the display parked on the dashboard.
 */
export function CelebrationOverlay() {
  const [latest, setLatest] = useState<StatusCelebration | null>(null);
  const [isVisible, setIsVisible] = useState(false); // video visible
  const [isSlidingOut, setIsSlidingOut] = useState(false);
  const [showNotificationAnimation, setShowNotificationAnimation] = useState(false);
  const [showNotificationTransition, setShowNotificationTransition] = useState(false);

  const videoDoneRef = useRef<HTMLVideoElement>(null);
  const videoReviewRef = useRef<HTMLVideoElement>(null);
  // Ignore new celebrations while one is playing, so they don't overlap.
  const busy = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  };

  // Trigger: a status_celebration arrives → run the sequence.
  useEffect(() => {
    const off = onRealtimeEvent((e) => {
      if (e.event !== "status_celebration" || !e.celebration) return;
      const status = e.celebration.new_status;
      if (status !== "Done" && status !== "Review") return;
      if (busy.current) return;
      busy.current = true;
      // playVideo(): wait 3s → show video; +2s → activate the card behind it.
      later(() => {
        setLatest(e.celebration!);
        setIsVisible(true);
        later(() => setShowNotificationAnimation(true), 2000);
      }, 3000);
    });
    return () => {
      off();
      timers.current.forEach(clearTimeout);
    };
  }, []);

  // Play the matching video once the container is shown.
  useEffect(() => {
    if (isVisible && latest?.new_status === "Done") videoDoneRef.current?.play().catch(() => {});
    if (isVisible && latest?.new_status === "Review") videoReviewRef.current?.play().catch(() => {});
  }, [isVisible, latest]);

  const handleVideoEnd = () => {
    setIsSlidingOut(true);
    later(() => {
      setIsVisible(false);
      later(() => setShowNotificationTransition(true), 500);
      later(() => {
        setShowNotificationAnimation(false);
        setShowNotificationTransition(false);
        setIsSlidingOut(false);
        setLatest(null);
        busy.current = false;
      }, 5000);
    }, 1000);
  };

  return (
    <>
      <div
        className={`${
          isVisible && latest?.new_status === "Done" ? "visible opacity-100" : "invisible opacity-0"
        } fixed inset-0 z-[5000] flex items-center justify-center ${
          isSlidingOut ? "animate-slide-out-left" : "animate-fade-in"
        }`}
      >
        <video
          ref={videoDoneRef}
          className="h-full w-full object-cover"
          muted
          playsInline
          onEnded={handleVideoEnd}
        >
          <source src="/NotificationVideo.mp4" type="video/mp4" />
        </video>
      </div>

      <div
        className={`${
          isVisible && latest?.new_status === "Review" ? "visible opacity-100" : "invisible opacity-0"
        } fixed inset-0 z-[5000] flex items-center justify-center ${
          isSlidingOut ? "animate-slide-out-left" : "animate-fade-in"
        }`}
      >
        <video
          ref={videoReviewRef}
          className="h-full w-full object-cover"
          muted
          playsInline
          onEnded={handleVideoEnd}
        >
          <source src="/reviewAnimationVideo.mp4" type="video/mp4" />
        </video>
      </div>

      {showNotificationAnimation && latest && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-[#181F2A80] backdrop-blur-[6px]">
          <div className="relative w-[1230px]">
            <div className="absolute h-full w-full">
              <div
                className={`absolute transition-all duration-1000 ease-in-out ${
                  showNotificationTransition
                    ? "left-[-15px] top-[-15px] opacity-100"
                    : "left-[45px] top-[45px] opacity-0"
                }`}
              >
                <TopLeftBlock />
              </div>
              <div
                className={`absolute transition-all duration-1000 ease-in-out ${
                  showNotificationTransition
                    ? "left-[320px] top-[-80px] opacity-100"
                    : "left-[260px] top-[80px] opacity-0"
                }`}
              >
                <TopMiddleBlock />
              </div>
              <div
                className={`absolute transition-all duration-1000 ease-in-out ${
                  showNotificationTransition
                    ? "right-[-80px] top-[-80px] opacity-100"
                    : "right-[80px] top-[80px] opacity-0"
                }`}
              >
                <TopRightBlock />
              </div>
              <div
                className={`absolute transition-all duration-1000 ease-in-out ${
                  showNotificationTransition
                    ? "right-[-80px] top-[135px] opacity-100"
                    : "right-[80px] top-[135px] opacity-0"
                }`}
              >
                <RightMiddleBlock />
              </div>
              <div
                className={`absolute transition-all duration-1000 ease-in-out ${
                  showNotificationTransition
                    ? "bottom-[-45px] left-[-45px] opacity-100"
                    : "bottom-[100px] left-[100px] opacity-0"
                }`}
              >
                <BottomLeftBlock />
              </div>
              <div
                className={`absolute transition-all duration-1000 ease-in-out ${
                  showNotificationTransition
                    ? "bottom-[-75px] right-[-75px] opacity-100"
                    : "bottom-[75px] right-[75px] opacity-0"
                }`}
              >
                <BottomRightBlock />
              </div>
            </div>
            <AnimatedNotification
              key={latest.id}
              oldStatus={latest.previous_status}
              newStatus={latest.new_status}
              userName={latest.user_name}
              boardName={latest.board_name}
              taskName={latest.task_name}
              userImage={latest.user_image}
              timestamp={latest.timestamp}
            />
          </div>
        </div>
      )}
    </>
  );
}
