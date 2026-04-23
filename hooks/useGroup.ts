import { useEffect, useState } from "react";

import { normalizeGroup, parseTimestamp, GROUP_API_URL } from "@/lib/group-client";
import { type CartItem, type Group, type GroupResponse, type Participant } from "@/types/group";

import { useSocket } from "./useSocket";

const HEARTBEAT_MS = 15_000;

type UseGroupResult = {
  group: Group | null;
  participants: Participant[];
  cart: CartItem[];
  isHost: boolean;
  timeLeft: number;
  sessionWarning: boolean;
  loading: boolean;
};

export function useGroup(groupId?: string): UseGroupResult {
  const { socket } = useSocket();
  const [group, setGroup] = useState<Group | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setUserId(window.localStorage.getItem("userId"));
  }, []);

  useEffect(() => {
    if (!groupId) {
      return;
    }

    const controller = new AbortController();

    async function loadGroup() {
      try {
        setLoading(true);
        const response = await fetch(`${GROUP_API_URL}/api/groups/${groupId}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Unable to load group");
        }

        const data = (await response.json()) as GroupResponse;
        const nextGroup = normalizeGroup(data.group);

        setGroup(nextGroup);
        setParticipants(nextGroup.participants);
        setCart(nextGroup.cart);
        setTimeLeft(Math.max(0, parseTimestamp(nextGroup.expiresAt) - Date.now()));

        if (typeof window !== "undefined") {
          window.localStorage.setItem("activeGroupCode", nextGroup.code);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error(error);
        setGroup(null);
        setParticipants([]);
        setCart([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadGroup();

    return () => controller.abort();
  }, [groupId]);

  useEffect(() => {
    if (!socket || !group?.id || !userId) {
      return;
    }

    socket.emit("join_room", {
      groupId: group.id,
      userId,
    });

    socket.emit("heartbeat", {
      groupId: group.id,
      userId,
    });

    const heartbeat = window.setInterval(() => {
      socket.emit("heartbeat", {
        groupId: group.id,
        userId,
      });
    }, HEARTBEAT_MS);

    return () => {
      socket.emit("leave_room", {
        groupId: group.id,
        userId,
      });
      window.clearInterval(heartbeat);
    };
  }, [group?.id, socket, userId]);

  return {
    group,
    participants,
    cart,
    isHost: Boolean(userId && group?.hostId === userId),
    timeLeft,
    sessionWarning,
    loading,
  };
}
