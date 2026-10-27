export type WordingRuleId =
	| "length-tell"
	| "verdict-prefix"
	| "antipattern-name"
	| "label-echo"
	| "self-refuting-distractor"
	| "long-stem"
	| "pivotal-leak"
	| "probe-not-question"
	| "cause-leak"
	| "gold-too-long"
	| "established-decision-leak";

export interface WordingFinding {
	ruleId: WordingRuleId;
	where: string;
	message: string;
}
