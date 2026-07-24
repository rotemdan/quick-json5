import { PositionInfo} from "./Utilities.js"

export class JsonParserError extends Error {
	constructor(public readonly message: string, public readonly positionInfo: PositionInfo) {
		super(message)
	}
}
