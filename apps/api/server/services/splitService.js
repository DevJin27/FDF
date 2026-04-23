const { getGroup } = require("../state");

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function formatMoney(amount) {
  return Number(amount || 0).toFixed(2);
}

function getRequiredGroup(groupId) {
  const group = getGroup(groupId);

  if (!group) {
    throw createHttpError(404, "Group not found");
  }

  return group;
}

function getResolvedHostName(group) {
  const hostParticipant = (group.participants || []).find((participant) => participant.id === group.hostId);

  return group.hostName || group.settlement?.hostName || hostParticipant?.name || "Host";
}

function generateUpiLink({ upiId, hostName, amount, note = "Group Blinkit order" }) {
  if (!upiId) {
    return null;
  }

  const params = new URLSearchParams({
    pa: upiId,
    pn: hostName || "Host",
    am: Number(amount || 0).toFixed(2),
    cu: "INR",
    tn: note,
  });

  return `upi://pay?${params.toString()}`;
}

function calculateSplit(groupId) {
  const group = getRequiredGroup(groupId);
  const participants = group.participants || [];
  const participantCount = participants.length;
  const hostName = getResolvedHostName(group);
  const deliveryFee = Number(group.deliveryFee || 0);

  const userSubtotals = participants.reduce((totals, participant) => {
    totals[participant.id] = 0;
    return totals;
  }, {});

  const cartTotal = (group.cart || []).reduce((sum, item) => {
    const itemTotal = Number(item.totalPrice || 0);

    (item.contributions || []).forEach((contribution) => {
      const contributionTotal = Number(contribution.qty || 0) * Number(item.pricePerUnit || 0);
      userSubtotals[contribution.userId] = Number(
        ((userSubtotals[contribution.userId] || 0) + contributionTotal).toFixed(2),
      );
    });

    return Number((sum + itemTotal).toFixed(2));
  }, 0);

  const baseDeliveryShare = participantCount > 0 ? Math.floor(deliveryFee / participantCount) : 0;
  const deliveryRemainder = participantCount > 0 ? deliveryFee - baseDeliveryShare * participantCount : 0;

  const splitParticipants = participants.map((participant) => {
    const isHost = participant.id === group.hostId;
    const itemsTotal = Number((userSubtotals[participant.id] || 0).toFixed(2));
    const deliveryShare = participantCount === 0
      ? 0
      : baseDeliveryShare + (isHost ? deliveryRemainder : 0);
    const grandTotal = Number((itemsTotal + deliveryShare).toFixed(2));
    const owesAmount = isHost ? null : formatMoney(grandTotal);

    return {
      userId: participant.id,
      userName: participant.name,
      isHost,
      itemsTotal: formatMoney(itemsTotal),
      deliveryShare: formatMoney(deliveryShare),
      grandTotal: formatMoney(grandTotal),
      owesTo: isHost ? null : group.hostId,
      owesAmount,
      upiLink: isHost
        ? null
        : generateUpiLink({
            upiId: group.settlement?.upiId,
            hostName,
            amount: grandTotal,
          }),
    };
  });

  const computedGrandTotal = Number(
    splitParticipants.reduce((sum, participant) => sum + Number(participant.grandTotal), 0).toFixed(2),
  );
  const expectedGrandTotal = Number((cartTotal + deliveryFee).toFixed(2));

  if (computedGrandTotal !== expectedGrandTotal) {
    console.warn(
      `Split total mismatch for group ${groupId}: expected ${expectedGrandTotal.toFixed(2)}, got ${computedGrandTotal.toFixed(2)}`,
    );
  }

  return {
    participants: splitParticipants,
    cartTotal: formatMoney(cartTotal),
    deliveryFee: formatMoney(deliveryFee),
    grandTotal: formatMoney(expectedGrandTotal),
    hostId: group.hostId,
    hostName,
  };
}

function getSplitSummary(groupId) {
  const split = calculateSplit(groupId);
  const breakdown = split.participants
    .filter((participant) => !participant.isHost)
    .map((participant) => ({
      name: participant.userName,
      owes: participant.owesAmount,
      upiLink: participant.upiLink,
    }));

  const hostCollects = breakdown.reduce((sum, participant) => sum + Number(participant.owes || 0), 0);

  return {
    breakdown,
    hostCollects: formatMoney(hostCollects),
  };
}

module.exports = {
  calculateSplit,
  generateUpiLink,
  getSplitSummary,
};
