import technologyCommunityImage from "../assets/images/community-technology.svg";
import studyCommunityImage from "../assets/images/community-study.svg";
import gamingCommunityImage from "../assets/images/community-gaming.svg";
import friendsCommunityImage from "../assets/images/community-friends.svg";
import createdCommunityImage from "../assets/images/community-created.svg";
import invitedCommunityImage from "../assets/images/community-invited.svg";

const communityImageStorageKey = "yappy.communityImages.v1";

const communityImageAssets = {
  technology: technologyCommunityImage,
  study: studyCommunityImage,
  gaming: gamingCommunityImage,
  friends: friendsCommunityImage,
  created: createdCommunityImage,
  invited: invitedCommunityImage,
};

export function readCommunityImageAssignments() {
  try {
    const storedAssignments = JSON.parse(
      localStorage.getItem(communityImageStorageKey) || "{}",
    );
    return storedAssignments && typeof storedAssignments === "object"
      ? storedAssignments
      : {};
  } catch {
    return {};
  }
}

export function persistCommunityImageAssignments(assignments) {
  try {
    localStorage.setItem(communityImageStorageKey, JSON.stringify(assignments));
  } catch {
    return false;
  }
  return true;
}

export function getCommunityImageId(server, assignments) {
  const assignedImageId = assignments[String(server.id)];
  if (communityImageAssets[assignedImageId]) {
    return assignedImageId;
  }

  const name = String(server.name || "").trim().toLowerCase();
  if (name.includes("tech")) return "technology";
  if (name.includes("study") || name.includes("book")) return "study";
  if (name.includes("gaming") || name.includes("game")) return "gaming";
  if (name.includes("friend")) return "friends";
  return "created";
}

export function getCommunityImage(server, assignments) {
  return communityImageAssets[getCommunityImageId(server, assignments)];
}