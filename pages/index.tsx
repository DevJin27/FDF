import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { v4 as uuidv4 } from "uuid";

import { GROUP_API_URL } from "@/lib/group-client";
import type { CreateGroupResponse } from "@/types/group";

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
  const [createError, setCreateError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const savedUserId = window.localStorage.getItem("userId");
    if (savedUserId) {
      setUserId(savedUserId);
      return;
    }

    const nextUserId = uuidv4();
    window.localStorage.setItem("userId", nextUserId);
    setUserId(nextUserId);
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

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[480px] flex-col justify-center">
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
              <div className="mt-5 rounded-3xl border border-dashed border-black/10 bg-[#fffaf0] px-4 py-6 text-sm text-[#6f6a5a]">
                Join flow lands in the next pass.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
