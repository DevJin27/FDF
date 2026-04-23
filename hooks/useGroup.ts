import { useEffect, useState } from "react";

import {
  normalizeCartItem,
  normalizeGroup,
  normalizeParticipant,
  parseTimestamp,
  GROUP_API_URL,
} from "@/lib/group-client";
import {
  type CartItem,
  type CartUpdatedPayload,
  type Group,
  type GroupLockedPayload,
  type GroupResponse,
  type HostChangedPayload,
  type Participant,
  type SessionWarningPayload,
  type UserJoinedPayload,
  type UserLeftPayload,
} from "@/types/group";

import { useSocket } from "./useSocket";

const HEARTBEAT_MS = 15_000;
const WARNING_MS = 300_000;

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
  const [sessionWarning, setSessionWarning] = useState(false);
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
        setSessionWarning(parseTimestamp(nextGroup.expiresAt) - Date.now() < WARNING_MS);

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

    const handleUserJoined = (payload: UserJoinedPayload) => {
      const nextParticipant = normalizeParticipant({
        ...payload.participant,
        online: true,
      });

      setParticipants((current) => {
        const existing = current.find((participant) => participant.id === nextParticipant.id);
        if (!existing) {
          return [...current, nextParticipant];
        }

        return current.map((participant) =>
          participant.id === nextParticipant.id ? nextParticipant : participant,
        );
      });

      setGroup((current) => {
        if (!current) {
          return current;
        }

        const nextParticipants = current.participants.some(
          (participant) => participant.id === nextParticipant.id,
        )
          ? current.participants.map((participant) =>
              participant.id === nextParticipant.id ? nextParticipant : participant,
            )
          : [...current.participants, nextParticipant];

        return {
          ...current,
          participants: nextParticipants,
        };
      });
    };

    const handleUserLeft = ({ userId: departedUserId }: UserLeftPayload) => {
      setParticipants((current) =>
        current.map((participant) =>
          participant.id === departedUserId
            ? {
                ...participant,
                online: false,
                lastSeen: Date.now(),
              }
            : participant,
        ),
      );

      setGroup((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          participants: current.participants.map((participant) =>
            participant.id === departedUserId
              ? {
                  ...participant,
                  online: false,
                  lastSeen: Date.now(),
                }
              : participant,
          ),
        };
      });
    };

    const handleCartUpdated = ({ cart: nextCart }: CartUpdatedPayload) => {
      const normalizedCart = nextCart.map((item) => normalizeCartItem(item));
      setCart(normalizedCart);
      setGroup((current) => (current ? { ...current, cart: normalizedCart } : current));
    };

    const handleHostChanged = ({ newHostId, newHostName }: HostChangedPayload) => {
      setGroup((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          hostId: newHostId,
          settlement: {
            ...current.settlement,
            hostName: newHostName,
          },
        };
      });
    };

    const handleSessionWarning = (_payload: SessionWarningPayload) => {
      setSessionWarning(true);
    };

    const handleSessionExpired = () => {
      setTimeLeft(0);
      setSessionWarning(false);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("activeGroupCode");
      }
    };

    const handleGroupLocked = ({ finalCart }: GroupLockedPayload) => {
      const normalizedCart = finalCart.map((item) => normalizeCartItem(item));
      setCart(normalizedCart);
      setGroup((current) =>
        current
          ? {
              ...current,
              status: "locked",
              cart: normalizedCart,
            }
          : current,
      );
    };

    socket.on("user_joined", handleUserJoined);
    socket.on("user_left", handleUserLeft);
    socket.on("cart_updated", handleCartUpdated);
    socket.on("host_changed", handleHostChanged);
    socket.on("session_warning", handleSessionWarning);
    socket.on("session_expired", handleSessionExpired);
    socket.on("group_locked", handleGroupLocked);

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
      socket.off("user_joined", handleUserJoined);
      socket.off("user_left", handleUserLeft);
      socket.off("cart_updated", handleCartUpdated);
      socket.off("host_changed", handleHostChanged);
      socket.off("session_warning", handleSessionWarning);
      socket.off("session_expired", handleSessionExpired);
      socket.off("group_locked", handleGroupLocked);
      socket.emit("leave_room", {
        groupId: group.id,
        userId,
      });
      window.clearInterval(heartbeat);
    };
  }, [group?.id, socket, userId]);

  useEffect(() => {
    if (!group?.expiresAt) {
      return;
    }

    const updateTimeLeft = () => {
      const nextTimeLeft = Math.max(0, parseTimestamp(group.expiresAt) - Date.now());
      setTimeLeft(nextTimeLeft);
      if (nextTimeLeft > 0 && nextTimeLeft < WARNING_MS) {
        setSessionWarning(true);
      }
    };

    updateTimeLeft();
    const timer = window.setInterval(updateTimeLeft, 1_000);

    return () => window.clearInterval(timer);
  }, [group?.expiresAt]);

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
