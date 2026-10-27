import { describe, expect, it } from "vitest";
import {
	ALL_DISLIKED_TAGS,
	ALL_LIKED_TAGS,
	calculateRatingStats,
	DRILL_DISLIKED_TAG_LABELS,
	DRILL_LIKED_TAG_LABELS,
	MIN_RATING_THRESHOLD,
	sanitizeFeedbackTags,
} from "../index.js";

describe("Drill Feedback Domain Logic", () => {
	it("correctly maps 4 liked and 5 disliked tags to human labels", () => {
		expect(ALL_LIKED_TAGS).toEqual([
			"hit_at_work",
			"clear_explanation",
			"good_challenge",
			"learned_something",
		]);
		expect(ALL_DISLIKED_TAGS).toEqual([
			"disagree_with_answer",
			"ambiguous_question",
			"felt_like_trick",
			"doesnt_match_experience",
			"explanation_didnt_resonate",
		]);

		expect(DRILL_LIKED_TAG_LABELS.hit_at_work).toBe("Hit this at work");
		expect(DRILL_LIKED_TAG_LABELS.clear_explanation).toBe("Clear explanation");
		expect(DRILL_LIKED_TAG_LABELS.good_challenge).toBe("Good challenge");
		expect(DRILL_LIKED_TAG_LABELS.learned_something).toBe(
			"Learned something new",
		);

		expect(DRILL_DISLIKED_TAG_LABELS.disagree_with_answer).toBe(
			"Disagree with answer",
		);
		expect(DRILL_DISLIKED_TAG_LABELS.ambiguous_question).toBe(
			"Question was ambiguous",
		);
		expect(DRILL_DISLIKED_TAG_LABELS.felt_like_trick).toBe("Felt like a trick");
		expect(DRILL_DISLIKED_TAG_LABELS.doesnt_match_experience).toBe(
			"Doesn't match my experience",
		);
		expect(DRILL_DISLIKED_TAG_LABELS.explanation_didnt_resonate).toBe(
			"Explanation didn't resonate",
		);
	});

	it("returns null percentage when total votes are below minimum threshold", () => {
		const stats0 = calculateRatingStats("AGD-00101", 0, 0);
		expect(stats0.totalVotes).toBe(0);
		expect(stats0.likePercentage).toBeNull();

		const stats2 = calculateRatingStats("AGD-00101", 2, 0);
		expect(stats2.totalVotes).toBe(2);
		expect(stats2.likePercentage).toBeNull();
	});

	it("calculates likePercentage correctly when total votes meet or exceed threshold", () => {
		expect(MIN_RATING_THRESHOLD).toBe(3);

		const stats3 = calculateRatingStats("AGD-00101", 2, 1);
		expect(stats3.totalVotes).toBe(3);
		expect(stats3.likePercentage).toBe(67); // 2/3 = 66.67% rounded to 67

		const stats100 = calculateRatingStats("AGD-00101", 85, 15);
		expect(stats100.totalVotes).toBe(100);
		expect(stats100.likePercentage).toBe(85);
	});

	it("preserves tag counts and safely handles missing or negative values", () => {
		const tags = {
			hit_at_work: 12,
			clear_explanation: 8,
			ambiguous_question: 3,
		};
		const stats = calculateRatingStats("AGD-00101", -5, 10, tags);
		expect(stats.upVotes).toBe(0);
		expect(stats.downVotes).toBe(10);
		expect(stats.totalVotes).toBe(10);
		expect(stats.likePercentage).toBe(0);
		expect(stats.tagCounts).toEqual(tags);
	});

	it("sanitizes feedback tags and normalizes legacy tags", () => {
		// Normalizes legacy tags for 'up'
		const upTags = sanitizeFeedbackTags("up", [
			"realistic",
			"useful",
			"hit_at_work",
			"invalid_tag",
		]);
		expect(upTags).toEqual(["hit_at_work", "clear_explanation"]);

		// Normalizes legacy tags for 'down'
		const downTags = sanitizeFeedbackTags("down", [
			"unrealistic",
			"unclear",
			"disagree_with_answer",
			"bad_tag",
		]);
		expect(downTags).toEqual([
			"doesnt_match_experience",
			"ambiguous_question",
			"disagree_with_answer",
		]);
	});
});
