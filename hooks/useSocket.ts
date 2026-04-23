import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { GROUP_API_URL } from "@/lib/group-client";

let sharedSocket: Socket | null = null;
let activeConsumers = 0;

function getSharedSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io(GROUP_API_URL, {
      autoConnect: false,
    });
  }

  return sharedSocket;
}

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const instance = getSharedSocket();
    activeConsumers += 1;
    setSocket(instance);
    setConnected(instance.connected);

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    instance.on("connect", handleConnect);
    instance.on("disconnect", handleDisconnect);

    if (!instance.connected) {
      instance.connect();
    }

    return () => {
      instance.off("connect", handleConnect);
      instance.off("disconnect", handleDisconnect);
      activeConsumers = Math.max(0, activeConsumers - 1);

      if (activeConsumers === 0) {
        instance.disconnect();
      }
    };
  }, []);

  return {
    socket,
    connected,
  };
}
