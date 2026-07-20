export type TypedArray =
	Int8Array |
	Uint8Array |
	Uint8ClampedArray |
	Int16Array |
	Uint16Array |
	Int32Array |
	Uint32Array |
	BigInt64Array |
	BigUint64Array |
	Float32Array |
	Float64Array

export type TypedArrayConstructor =
	Int8ArrayConstructor |
	Uint8ArrayConstructor |
	Uint8ClampedArrayConstructor |
	Int16ArrayConstructor |
	Uint16ArrayConstructor |
	Int32ArrayConstructor |
	Uint32ArrayConstructor |
	BigInt64ArrayConstructor |
	BigUint64ArrayConstructor |
	Float32ArrayConstructor |
	Float64ArrayConstructor

export type TypedArrayToConstructor<T extends TypedArray> =
	T extends Int8Array ? Int8ArrayConstructor :
	T extends Uint8Array ? Uint8ArrayConstructor :
	T extends Uint8ClampedArray ? Uint8ClampedArrayConstructor :
	T extends Int16Array ? Int16ArrayConstructor :
	T extends Uint16Array ? Uint16ArrayConstructor :
	T extends Int32Array ? Int32ArrayConstructor :
	T extends Uint32Array ? Uint32ArrayConstructor :
	T extends BigInt64Array ? BigInt64ArrayConstructor :
	T extends BigUint64Array ? BigUint64ArrayConstructor :
	T extends Float32Array ? Float32ArrayConstructor :
	T extends Float64Array ? Float64ArrayConstructor :
	never;
