import React from "react";
import { AbsoluteFill } from "remotion";
import { sweep } from "../look";

/** Dev/Twins: the shared twins next to their captures. Stub until the twins owner fills it (V4.md section 5). */
const Gallery: React.FC = () => <AbsoluteFill style={{ background: sweep() }} />;
export default Gallery;
