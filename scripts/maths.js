

//  REVISION

//  Thursday.
//  26 December 2024. 
//  17:28 EST.






    /////////////
   //         //
  //   CSS   //
 //         //
/////////////


//  Copied over from `grid.css`.
//  So if we make changes in CSS, must manually reflect them here!

const css = {

	leading:     24,
	leadingHalf: 12,
	columnWidth: 24 * 2,
	fontSize:    16
}






    ///////////////////
   //               //
  //   Constants   //
 //               //
///////////////////


const 
RA  = Math.PI / 2,//  “Right angle” ie. 90˚
PI  = Math.PI,
TAU = Math.PI * 2






    ////////////////
   //            //
  //   Sanity   //
 //            //
////////////////


function isUsefulNumber( n ){

	return isNaN( n ) === false && 
		( typeof n === 'number' || n instanceof Number ) &&
		n !==  Infinity &&
		n !== -Infinity
}
function isNotUsefulNumber( n ){

	return !isUsefulNumber( n )
}
function isUsefulInteger( n ){

	return isUsefulNumber( n ) && Number.isInteger( n )
}
function isNotUsefulInteger( n ){

	return !isUsefulInteger( n )
}






    //////////////////
   //              //
  //   Unitless   //
 //              //
//////////////////


function isBetweenDeluxe( n, a, b, option ){

	if( isNotUsefulNumber( n )) return null
	if( isNotUsefulNumber( a )) return null
	let lo, hi
	if( isUsefulNumber( b )){

		lo = a
		hi = b
	}
	else {

		lo = 0
		hi = a
	}
	if( option === 'inclusive' )
		return ( a <= n && n <= b )
	else if( option === 'exclusive' )
		return ( a < n && n < b )
	else null
}

function isBetween( n, a, b ){

	return isBetweenDeluxe( n, a, b, 'inclusive' )
}
function isBetweenInclusive( n, a, b ){

	return isBetweenDeluxe( n, a, b, 'inclusive' )
}
function isBetweenExclusive( n, a, b ){

	return isBetweenDeluxe( n, a, b, 'exclusive' )
}

function isNotBetween( n, a, b ){

	return !isBetweenDeluxe( n, a, b, 'inclusive' )
}
function isNotBetweenInclusive( n, a, b ){

	return !isBetweenDeluxe( n, a, b, 'inclusive' )
}
function isNotBetweenExclusive( n, a, b ){

	return !isBetweenDeluxe( n, a, b, 'exclusive' )
}




function round( n, e ){
	
	if( isNotUsefulInteger( e )) e = 0
	const f = 10 ** e
	return Math.round( n * f ) / f
}
function norm( n, minOrRange, max ){

	let 
	min   = 0,
	range = minOrRange

	if( isUsefulNumber( max )){
	
		min = minOrRange
		range = max - min
	}
	return ( n - min ) / range
}
function normCapped( n, minOrRange, max ){

	return Math.max( Math.min( norm( n, minOrRange, max ), 1 ), 0 )
}
function lerp( min, max, n ){

	const range = max - min
	return min + range * n
}
function mapRange( value, min1, max1, min2, max2 ){
 
	return min2 + ( max2 - min2 ) * (( value - min1 ) / ( max1 - min1 ))
}


//  Expecting a String
//  containing two numbers
//  separated by a single symbol indicating proportional relationship.

function ratioToQuotient( ratioString ){

	const numbers = ratioString
		.trim()
		.replace( /\:|᛬|\/|÷|➗|x|×|✖️|✕|✖/g, ',' )
		.split( ',' )
		.map( function( n ){

			return parseFloat( n )
		})
	if( numbers.length !== 2 ) return NaN
	return numbers[ 0 ] / numbers[ 1 ]
}


//  Returns a number with the magnitude of x and the sign of y.
//  Credit to @winwaed: https://github.com/winwaed/superellipse/blob/master/SuperEllipse.py

function copySign( x, y ){

	return Math.abs( x ) * Math.sign( y )
}


//  Returns x to the power y while preserving the sign of x.
//  This allows us to plot all four quadrants with a single loop
//  and no additional sign logic.
//  Credit to @winwaed: https://github.com/winwaed/superellipse/blob/master/SuperEllipse.py

function signedPower( x, y ){

	return copySign( Math.abs( x ) ** y, x )
}






    ////////////////////
   //                //
  //   Geo + Trig   //
 //                //
////////////////////


function degreesToRadians( degrees ){

	return degrees * Math.PI / 180
}
function radiansToDegrees( radians ){

	return radians * 180 / Math.PI
}
function wrapToRange( n, range ){

	while( n < 0 ) n += range
	return n % range
}
function normalizeAngle( radians ){
	
	if( radians < 0 ) return TAU - ( Math.abs( radians ) % TAU )
	return radians % TAU
}
function polarToCartesian( radius, theta, centerX = 0, centerY = 0 ){
	
	return [ 

		centerX + Math.cos( theta ) * radius, 
		centerY + Math.sin( theta ) * radius
	]
}
function rotateCartesian( x, y, radians ){
	
	return [
	
		Math.cos( radians ) * x - Math.sin( radians ) * y,
		Math.sin( radians ) * x + Math.cos( radians ) * y
	]
}
function findMidpoint( a, b, av, bv, range ){

	if( isNotUsefulNumber( av )) av = 1
	if( isNotUsefulNumber( bv )) bv = 1


	//  It’s likely we’re finding a point between two angles
	//  given in radians (a range of 0..2π, and 2π = TAU).
	//  But it’s trivial to specify the range as 0..360˚ instead.

	if( isNotUsefulNumber( range )) range = TAU
	const halfRange = range / 2


	//  Let’s start out be ensuring that both numbers 
	//  are within our wrapped range.
	
	const
	aWrapped = wrapToRange( a, range ),
	bWrapped = wrapToRange( b, range )


	//  Now we’ll find the shortest span between these numbers.
	//  We’ll use this example:
	//  a     =  15˚
	//  b     = 355˚
	//  range = 360˚

	let
	smaller  = aWrapped,
	smallerV = av,
	larger   = bWrapped,
	largerV  = bv,
	diff     = larger - smaller


	//  Did we goof by confusing which value was smaller?
	//  That’s easily fixable.

	if( larger < smaller ){
	
		const tempN = larger
		larger  = smaller
		smaller = tempN
		diff    = larger - smaller
		const tempV = largerV
		largerV  = smallerV
		smallerV = tempV
	}


	//  At this point we find that diff === 340˚,
	//  but we know from experience that 
	//  15˚ and 355˚ are actually only 20˚ apart.
	//  Let’s fix that.

	if( diff > halfRange ){
	
		const tempN = larger
		larger  = smaller + range
		smaller = tempN
		diff    = larger - smaller
		const tempV = largerV
		largerV  = smallerV
		smallerV = tempV
	}
	

	//  Decide where in that range we should pick a value.
	
	const 
	smallerVAbs = Math.abs( smallerV ),
	largerVAbs  = Math.abs( largerV ),
	velocitiesTotal = smallerVAbs + largerVAbs,
	weight   = norm( smallerVAbs, velocitiesTotal ),
	midPoint = lerp( smallerVAbs, largerVAbs, weight )

// ********** the above may be wrong as
//  smaller or larger may have negative values...
//  how do we pick the sign value????????!?!?!?!
	


	/*console.log( 
	
		'\n a˚ ', round( radiansToDegrees( a ), 2 ),
		'\n a v', round( av, 2 ),
		'\n b˚ ', round( radiansToDegrees( b ), 2 ),
		'\n b v', round( bv, 2 ),
		'\n range:',   range,
		'\n smaller˚ ', round( radiansToDegrees( smaller ), 2 ),
		'\n larger˚  ', round( radiansToDegrees( larger ), 2 ),
		'\n diff˚    ', round( radiansToDegrees( diff ), 2 ),
		'\n weight   ', round( weight, 2 ),
		'\n midPoint˚', round( radiansToDegrees( midPoint ), 2 )
	)*/
	return midPoint	
}
function distance2D( x1, x2, y1, y2 ){

	const
	a = x2 - x1,
	b = y2 - y1,
	d = Math.hypot( a, b )

	return d
}




function hexFromFloat( color ){
	
	return '#' + color.map( c => ( c * 255 ).toString( 16 ).padStart( 2, '0' )).join( '' )
}




export {

	css,
	
	RA,
	PI,
	TAU,

	isUsefulNumber,
	isNotUsefulNumber,
	isUsefulInteger,
	isNotUsefulInteger,
	
	isBetween,
	isBetweenInclusive,
	isBetweenExclusive,
	isNotBetween,
	isNotBetweenInclusive,
	isNotBetweenExclusive,
	
	round,
	norm,
	normCapped,
	lerp,
	mapRange,
	ratioToQuotient,
	copySign,
	signedPower,

	radiansToDegrees,
	
	findMidpoint,
	distance2D,
	normalizeAngle,
	polarToCartesian
}