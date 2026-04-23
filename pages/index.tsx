import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { v4 as uuidv4 } from "uuid";

import { GROUP_API_URL } from "@/lib/group-client";
import type { CreateGroupResponse, JoinGroupResponse } from "@/types/group";

const ADDRESS_PRESETS = [
  "Hostel A gate",
  "Hostel B gate",
  "Main gate",
  "Library",
  "Other...",
] as const;

type TabKey = "create" | "join";

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("create");
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [addressPreset, setAddressPreset] =
    useState<(typeof ADDRESS_PRESETS)[number]>("Hostel A gate");
  const [customAddress, setCustomAddress] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [createError, setCreateError] = useState("");
  const [joinError, setJoinError] = useState("");
  const [activeGroupCode, setActiveGroupCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const savedUserId = window.localStorage.getItem("userId");
    const savedActiveGroupCode = window.localStorage.getItem("activeGroupCode");
    if (savedUserId) {
      setUserId(savedUserId);
    } else {
      const nextUserId = uuidv4();
      window.localStorage.setItem("userId", nextUserId);
      setUserId(nextUserId);
    }

    if (savedActiveGroupCode) {
      setActiveGroupCode(savedActiveGroupCode);
    }
  }, []);

  const resolvedAddress =
    addressPreset === "Other..." ? customAddress.trim() : addressPreset;

  async function handleCreateGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) {
      return;
    }

    if (!name.trim() || !groupName.trim() || !resolvedAddress) {
      setCreateError("Fill in your name, group name, and delivery address.");
      return;
    }

    try {
      setSubmitting(true);
      setCreateError("");

      const response = await fetch(`${GROUP_API_URL}/api/groups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: groupName.trim(),
          address: resolvedAddress,
          hostId: userId,
          hostName: name.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to create group");
      }

      const data = (await response.json()) as CreateGroupResponse;
      window.localStorage.setItem("activeGroupCode", data.group.code);
      window.localStorage.setItem("userName", name.trim());
      await router.push(`/group/${data.group.code}`);
    } catch (error) {
      console.error(error);
      setCreateError("We couldn't create your group. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoinGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) {
      return;
    }

    if (!joinName.trim() || joinCode.trim().length !== 6) {
      setJoinError("Enter your name and a valid 6-character group code.");
      return;
    }

    try {
      setSubmitting(true);
      setJoinError("");

      const response = await fetch(`${GROUP_API_URL}/api/groups/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: joinCode.trim().toUpperCase(),
          userId,
          userName: joinName.trim(),
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setJoinError(data?.error ?? "Unable to join this group.");
        return;
      }

      const data = (await response.json()) as JoinGroupResponse;
      window.localStorage.setItem("activeGroupCode", data.group.code);
      window.localStorage.setItem("userName", joinName.trim());
      await router.push(`/group/${data.group.code}`);
    } catch (error) {
      console.error(error);
      setJoinError("We couldn't join that group. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRejoin() {
    if (!activeGroupCode) {
      return;
    }

    await router.push(`/group/${activeGroupCode}`);
  }

  function handleDismissRejoin() {
    window.localStorage.removeItem("activeGroupCode");
    setActiveGroupCode("");
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[480px] flex-col justify-center">
        {activeGroupCode ? (
          <section className="mb-4 rounded-[24px] border border-[#f0d774] bg-[#fff5cc] p-4 shadow-card">
            <p className="text-sm font-medium text-[#4f3f00]">You have an active group. Rejoin?</p>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={handleRejoin}
                className="flex-1 rounded-2xl bg-[#151515] px-4 py-3 text-sm font-semibold text-white"
              >
                Rejoin
              </button>
              <button
                type="button"
                onClick={handleDismissRejoin}
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-[#4b4637]"
              >
                Dismiss
              </button>
            </div>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-[28px] border border-black/5 bg-white/90 shadow-card backdrop-blur">
          <div className="bg-[#151515] px-5 py-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#FFD000]">
              FDF Groups
            </p>
            <h1 className="mt-3 text-[2rem] font-semibold leading-tight">
              Start a college group order before the cart closes.
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/72">
              Create a room, bring everyone in, and lock the cart when the order is ready.
            </p>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-2 rounded-2xl bg-[#f4f1e6] p-1 text-sm font-medium">
              <button
                type="button"
                onClick={() => setActiveTab("create")}
                className={`rounded-xl px-4 py-3 transition ${
                  activeTab === "create" ? "bg-white text-black shadow-sm" : "text-[#6f6a5a]"
                }`}
              >
                Create group
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("join")}
                className={`rounded-xl px-4 py-3 transition ${
                  activeTab === "join" ? "bg-white text-black shadow-sm" : "text-[#6f6a5a]"
                }`}
              >
                Join group
              </button>
            </div>

            {activeTab === "create" ? (
              <form className="mt-5 space-y-4" onSubmit={handleCreateGroup}>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#35322a]">Your name</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Priya"
                    className="w-full rounded-2xl border border-black/10 bg-[#fffdf7] px-4 py-3 outline-none transition focus:border-black/30"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#35322a]">Group name</span>
                  <input
                    value={groupName}
                    onChange={(event) => setGroupName(event.target.value)}
                    placeholder="Hostel A late-night snacks"
                    className="w-full rounded-2xl border border-black/10 bg-[#fffdf7] px-4 py-3 outline-none transition focus:border-black/30"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#35322a]">
                    Delivery address
                  </span>
                  <select
                    value={addressPreset}
                    onChange={(event) =>
                      setAddressPreset(event.target.value as (typeof ADDRESS_PRESETS)[number])
                    }
                    className="w-full rounded-2xl border border-black/10 bg-[#fffdf7] px-4 py-3 outline-none transition focus:border-black/30"
                  >
                    {ADDRESS_PRESETS.map((preset) => (
                      <option key={preset} value={preset}>
                        {preset}
                      </option>
                    ))}
                  </select>
                </label>

                {addressPreset === "Other..." ? (
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#35322a]">
                      Custom address
                    </span>
                    <input
                      value={customAddress}
                      onChange={(event) => setCustomAddress(event.target.value)}
                      placeholder="Outside the MBA block"
                      className="w-full rounded-2xl border border-black/10 bg-[#fffdf7] px-4 py-3 outline-none transition focus:border-black/30"
                    />
                  </label>
                ) : null}

                {createError ? <p className="text-sm text-red-600">{createError}</p> : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-2xl bg-[#FFD000] px-4 py-3 text-sm font-semibold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Creating group..." : "Create group"}
                </button>
              </form>
            ) : (
              <form className="mt-5 space-y-4" onSubmit={handleJoinGroup}>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#35322a]">Your name</span>
                  <input
                    value={joinName}
                    onChange={(event) => setJoinName(event.target.value)}
                    placeholder="Aarav"
                    className="w-full rounded-2xl border border-black/10 bg-[#fffdf7] px-4 py-3 normal-case outline-none transition focus:border-black/30"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#35322a]">
                    6-character code
                  </span>
                  <input
                    value={joinCode}
                    onChange={(event) =>
                      setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))
                    }
                    placeholder="ABC123"
                    className="w-full rounded-2xl border border-black/10 bg-[#fffdf7] px-4 py-3 font-semibold tracking-[0.3em] text-[#151515] outline-none transition focus:border-black/30"
                  />
                </label>

                {joinError ? <p className="text-sm text-red-600">{joinError}</p> : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-2xl bg-[#FFD000] px-4 py-3 text-sm font-semibold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Joining group..." : "Join group"}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
