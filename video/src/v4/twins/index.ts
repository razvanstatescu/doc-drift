/**
 * The v4 shared twins (V4.md section 5). Import everything from here: `import { PageTwin, pageRects } from "../../v4/twins"`.
 * STATUS.md says what each export does, with examples.
 */
export * from "./types";
export { PageTwin, pageRects, TokenChip, PAGE, AUTHOR } from "./PageTwin";
export type { PageLayout, Step2State } from "./PageTwin";
export { BylineItem, ReviewedLine, bylineItemSize, reviewedLineWidth, bylineTitle, STATE_WORD, BYLINE, BYLINE_SWAP, bylineSwapProgress, REVIEWED_TEXT } from "./BylineItem";
export type { BylineItemProps, BylineFrom } from "./BylineItem";
export { TooltipTwin, tooltipLayout, TOOLTIPS, TOOLTIP } from "./TooltipTwin";
export type { TooltipTwinProps } from "./TooltipTwin";
export { AnchorRail, anchorRailRects } from "./AnchorRail";
export type { AnchorRailProps, AnchorPulse } from "./AnchorRail";
export { ChangeRecord, changeRecordSize } from "./ChangeRecord";
export type { ChangeRecordProps } from "./ChangeRecord";
export { TerminalTwin, jsonLines, terminalSize } from "./TerminalTwin";
export type { TerminalTwinProps, TerminalCall, ToolKey } from "./TerminalTwin";
export { AgentPanelTwin, agentPanelRects, agentPanelHeightAt } from "./AgentPanelTwin";
export type { AgentPanelTwinProps } from "./AgentPanelTwin";
export { textWidth, layoutRuns, wrapText } from "./metrics";
