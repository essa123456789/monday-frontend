import { format } from "date-fns";

// Ported verbatim from baboons-dashboard (components/team/notifications/
// AnimatedNotification.tsx) so the celebration card looks identical.
const taskStatusColorMapping: Record<string, string> = {
  "To Do": "#508BF9",
  "Working on it": "#E65F3D",
  Review: "#F7AE4D",
  Done: "#8CD02E",
  Stuck: "#EA332D",
};

interface AnimatedNotificationProps {
  oldStatus: string;
  newStatus: string;
  userName?: string;
  boardName?: string;
  taskName?: string;
  userImage?: string | null;
  timestamp?: string;
}

export function AnimatedNotification({
  oldStatus,
  newStatus,
  userName = "Someone",
  boardName = "Board",
  taskName = "",
  userImage,
  timestamp,
}: AnimatedNotificationProps) {
  const formattedDate = timestamp ? format(new Date(timestamp), "MMM d") : format(new Date(), "MMM d");
  const formattedTime = timestamp ? format(new Date(timestamp), "HH:mm") : format(new Date(), "HH:mm");

  return (
    <div className="flex h-auto w-[1230px] flex-col items-center justify-between rounded-[30px] bg-[#2B303B] p-[54px]">
      <div className="flex w-full items-start gap-[24px]">
        {userImage ? (
          /* eslint-disable-next-line @next/next/no-img-element -- avatar from the API host */
          <img
            src={userImage}
            alt={userName}
            style={{ height: 108, width: 108, borderRadius: "100%", border: "3px solid #4FF7A8" }}
          />
        ) : (
          /* Initials rather than a remote placeholder: nothing here reaches
             outside the deployment. */
          <div
            aria-label={userName}
            className="flex items-center justify-center bg-[#4C5162] text-[42px] font-semibold text-white"
            style={{ height: 108, width: 108, borderRadius: "100%", border: "3px solid #4FF7A8" }}
          >
            {userName.trim().charAt(0).toUpperCase() || "?"}
          </div>
        )}

        <div className="flex h-full w-full flex-col">
          <p className="text-[42px] text-[#FFFFFF]">
            <span className="font-semibold">{userName}</span>&nbsp; updated a task in &nbsp;
            <span className="font-semibold">{boardName}</span>
          </p>

          <div className="mt-[24px] flex items-center justify-between">
            <div className="flex items-center gap-[8px]">
              <p
                style={{ color: taskStatusColorMapping[oldStatus] }}
                className="text-[36px] font-semibold"
              >
                {oldStatus}
              </p>
              <p className="text-[36px] text-[#A9ABAF]">to</p>
              <p
                style={{ color: taskStatusColorMapping[newStatus] }}
                className="text-[36px] font-semibold"
              >
                {newStatus}
              </p>
            </div>

            <div className="flex items-center gap-[8px]">
              <p className="text-[36px] text-[#A9ABAF]">{formattedDate}</p>
              <div className="h-1 w-1 rounded-full bg-[#A9ABAF]"></div>
              <p className="text-[36px] text-[#A9ABAF]">{formattedTime}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-[48px] flex items-center gap-2 self-stretch rounded-[24px] bg-[rgba(255,255,255,0.10)] p-[24px]">
        <p className="line-clamp-2 text-[36px] text-[#FFFFFFB2]">{taskName}</p>
      </div>
    </div>
  );
}
