import { PositionInfo} from "../utilities/Utilities.js"

export class JsonParserError extends Error {
	constructor(public readonly message: string, public readonly positionInfo: PositionInfo) {
		super(message)
	}
}
