import { 
	
	isBetween, 
	RA, PI, TAU,
	radiansToDegrees,
	lerp,
	mapRange

} from './maths.js'
import {

	notesMap,
	createFromHertz

} from './notes.js'




const 
REVISION   = 2,
verbosity  = 1,//0.5,
banksTotal = 3

const
octaveLowest  = 4,
octaveHighest = 8,
octaveRange   = octaveHighest - octaveLowest + 1,
notesTotal    = octaveRange * 12

const 
svgDefsEl    = document.getElementById( 'svg-defs' ),
noteSlicesEl = document.getElementById( 'note-slices' ),
noteLabelsEl = document.getElementById( 'note-labels' ),
noteSliceEls = [],
noteLabelEls = Array.from( noteLabelsEl.querySelectorAll( 'div' ))


let
tick = 0,
hasSetup    = false,
isListening = false,

audioContext,
analyser,
bufferLength,
timeDomainData,
frequencyData,
hzSpan,

scopeCanvas,
scopeContext,
graphCanvas,
graphContext,
xPrior = 0,
yPrior = 0






    /////////////////////
   //                 //
  //   Audio input   //
 //                 //
/////////////////////


function peakClassifier( frames, peakThreshold ){

	const kernelWidth = 2//  Try 4, 6, 8, for different peakiness sensitivity.
	for( let i = 0; i < frames.length; i ++ ){

		const fft = frames[ i ].getFFT()// ?????????
		for( 

			let bin = kernelWidth;
			bin < fft.length - kernelWidth; 
			bin ++ ){

			const
			kernelAvgL = 0,
			kernelAvgR = 0,
			kernelSum  = 0

			for( let k = 1; k < kernelWidth; k ++ ){
			
				kernelAvgL += fft[ bin ].amp - specs[ bin - k ].amp//  Look at lower Hz.
				kernelAvgR += fft[ bin ].amp - specs[ bin + k ].amp//  Look at higher Hz.
			}
			kernelAvgL /= k
			kernelAvgR /= k
			kernelSum   = (( kernelMaxL + kernelMaxR ) * 0.5 ) / fft[ bin ].amp

			if( kernelSum >= peakThreshold ) fft[ bin ].peak = true
		}//  for bin.
	}//  for i.
}
function peakClassifierMax( frms, peakThresh ){

	const kernelWidth = 2//  Try 4, 6, 8, for different peakiness sensitivity.
	for( let t = 0; t < frms.length; t ++ ){

		const fft = frms[ t ].getFFT()
		for( 
			
			let bin = kernelWidth; 
			bin < fft.length - kernelWidth;
			bin ++ ){

			const
			kernelMaxL = -1000,//  init arbitrarily min number.
			kernelMaxR = -1000,//  init arbitrarily min number.
			kernelSum  =     0

			for( let k = 1; k < kernelWidth; k ++ ){
				
				kernelMaxL = max( kernelMaxL, fft[ bin ].amp - specs[ bin - k ].amp )//  Look at lower Hz.
				kernelMaxR = max( kernelMaxR, fft[ bin ].amp - specs[ bin + k ].amp )//  Look at higher Hz.
			}
			kernelSum = (( kernelMaxL + kernelMaxR ) * 0.5 ) / fft[ bin ].amp
			if( kernelSum >= peakThresh ) fft[ bin ].peak = true

		}//  for bin.
	}//  for t.
}
let mediaStreamSource
async function getMedia(){

	const constraints = {

		audio: true,
		video: false
	}
	let stream = null
	try {
	
		stream = await navigator.mediaDevices.getUserMedia( constraints )
		console.log( '👍 Yay! Stream acquisition succeeded.' )

		mediaStreamSource = audioContext.createMediaStreamSource( stream )
		mediaStreamSource.connect( analyser )
		isListening = true
		animate()
	}
	catch( error ){
	
		console.log( '👎 Yikes. Stream acquisition failed.', error )
	}
}






    ///////////////
   //           //
  //   Setup   //
 //           //
///////////////


function setup(){


	//  Ensure that we can only setup once.

	if( hasSetup ) return false
	hasSetup = true
	this.style.display = 'none'


	//  Create our visual slices.
	
	for( let o = octaveLowest; o <= octaveHighest; o ++ ){
		
		const octaveRingEl = document.createElement( 'div' )
		octaveRingEl.classList.add( 'octave-ring' )
		octaveRingEl.setAttribute( 'octave', o )
		for( let n = 0; n < 12; n ++ ){

			const noteSliceEl = document.createElement( 'div' )
			noteSliceEl.classList.add( 'note-slice' )
			noteSliceEl.setAttribute( 'octave-index', o )
			noteSliceEl.setAttribute( 'name-index', n )
			
			const noteClipEl = document.createElement( 'div' )
			noteClipEl.classList.add( 'note-clip' )
			noteSliceEl.appendChild( noteClipEl )


			//  Need to make this dynamic!! bounds of container El
			const
			// width = 1,
			// height = 1
			width  = 600,
			height = 600

			const 
			ringWidth  = ( width / 2 ) / octaveRange,
			ringInner  = ringWidth * ( o - octaveLowest ),
			ringOuter  = ringInner + ringWidth,
			angleRange = TAU / 12,

			
			//  Don’t forget... Fucking trig is ANTI-CLOCKWISE
			//  so we need to SUBTRACT from an angle 
			//  to go in the clockwise direction we’re expecting. 

			// angleRange = 360 / 12,
			angleFirst = ( angleRange * n ) - ( angleRange / 2 ) - PI/2,
			angleFinal = angleFirst + angleRange,
			hue = mapRange( n, 0, 12, 0, 360 ),
			bri = mapRange( o+ 1, octaveLowest, octaveHighest, 0, 50 )

			// console.log( `name-index ${ n }, octave ${ o }, range ${ angleRange }˚, ${ angleFirst }˚… ${ angleFinal }˚` )
			if( n === 0 && o === 7 ) console.log( `name-index ${ n }, octave ${ o }, ringInner ${ ringInner }, ringOuter ${ ringOuter }` )


			const
			cx = width  / 2,
			cy = height / 2,
			
			x1 = cx + Math.cos( angleFirst ) * ringOuter,
			y1 = cy + Math.sin( angleFirst ) * ringOuter,
			
			x2 = cx + Math.cos( angleFinal ) * ringOuter,
			y2 = cy + Math.sin( angleFinal ) * ringOuter,
			
			x3 = cx + Math.cos( angleFinal ) * ringInner,
			y3 = cy + Math.sin( angleFinal ) * ringInner,

			x4 = cx + Math.cos( angleFirst ) * ringInner,
			y4 = cy + Math.sin( angleFirst ) * ringInner


			//  Create our SVG clipping path definition elements.

			const clipPathEl = document.createElement( 'clipPath' )
			clipPathEl.setAttribute( 'id', `o${ o }-l${ n }` )
			clipPathEl.setAttribute( 'clipPathUnits', 'objectBoundingBox' )
			const pathEl = document.createElement( 'path' )
			const drawCommand = 
				`M ${ x1 },${ y1 } `+
				`A ${ ringOuter },${ ringOuter }, 0,0,1 ${ x2 },${ y2 } `+
				`L ${ x3 }, ${ y3 } `+
				`A ${ ringInner },${ ringInner }, 0,0,0 ${ x4 },${ y4 } `+
				`Z`
			if( n === 0 && o === 7 ) console.log( 'drawCommand?\n', drawCommand )
			pathEl.setAttribute( 'd', drawCommand )
			clipPathEl.appendChild( pathEl )
			svgDefsEl.appendChild( clipPathEl )
			
			
			//  Now we can reference that SVG clipping path definition.

			noteSliceEl.style.filter = `drop-shadow( 0 0 10px hsl( ${ hue }deg 100% ${ bri }% / 0.5 ))`
			noteClipEl.style.backgroundColor = `hsl( ${ hue }deg 100% ${ bri }% )`
			// noteSliceEl.style.clipPath = `url("#o${ o }-l${ l }")`
			// noteSliceEl.style.clipPath = `circle(20%)`//  Works
			noteClipEl.style.clipPath = `path("${ drawCommand }")`
			
			
			octaveRingEl.appendChild( noteSliceEl )
			noteSliceEls.push( noteSliceEl )
		}
		noteSlicesEl.appendChild( octaveRingEl )
	}
	document.getElementById( 'container' ).style.display = 'block'


	//  AUDIO INPUT

	//  Setup out audio context, analyser,
	//  and data arrays for working magic.

	audioContext = new AudioContext()
	analyser = audioContext.createAnalyser()
	analyser.fftSize = 4096//2048
	bufferLength   = analyser.frequencyBinCount
	timeDomainData = new Uint8Array( bufferLength )
	frequencyData  = new Uint8Array( bufferLength )
	hzSpan = audioContext.sampleRate / bufferLength


	//  Just as a reality check, what’s our sample rate?

	if( verbosity >= 0.5 ) console.log( 

		'audioContext.sampleRate', 
		 audioContext.sampleRate
	)


	//  Ready our output canvi!

	graphCanvas  = document.getElementById( 'frequencies-graph' )
	graphContext = graphCanvas.getContext( '2d' )
	graphContext.lineWidth = 1
	xPrior = graphCanvas.width  / 2
	yPrior = graphCanvas.height / 2
	function fixCanvasResolution(){

		graphCanvas.width  = graphCanvas.clientWidth  * devicePixelRatio
		graphCanvas.height = graphCanvas.clientHeight * devicePixelRatio
	}
	fixCanvasResolution()
	window.addEventListener( 'resize', fixCanvasResolution )


	//  Hook up the microphone.

	getMedia()
}






    //////////////////////
   //                  //
  //   Conveniences   //
 //                  //
//////////////////////


function deactivateAllSlices(){

	noteSliceEls.forEach( function( el ){

		el.classList.remove( 'active' )
	})
	noteLabelEls.forEach( function( el ){

		el.classList.remove( 'active' )
	})
}
function activateAllSlices(){

	noteSliceEls.forEach( function( el ){

		el.classList.add( 'active' )
	})
	noteLabelEls.forEach( function( el ){

		el.classList.add( 'active' )
	})
}
function activateRing( octaveIndex ){

	Array.from( noteSlicesEl.querySelectorAll( `.note-slice[octave-index="${ octaveIndex }"]` ))
	.forEach( function( el ){

		el?.classList.add( 'active' )
	})
}
function activateSlice( nameIndex, octaveIndex ){


	//  Highlight the appropriate note slice,
	//  and the corresponding note label.
	//  Using `nameIndex` (rather than `noteName`)
	//  avoids naming ambiguities like A# vs B♭.

	const noteSliceEl = noteSlicesEl.querySelector( `[name-index="${ nameIndex }"][octave-index="${ octaveIndex }"]` )
	noteSliceEl?.classList.add( 'active' )
	const noteLabelEl = noteLabelsEl.querySelector( `[name-index="${ nameIndex }"]` )
	noteLabelEl?.classList.add( 'active' )
}
function stopListening(){

	isListening = false
}
function startListening(){

	setup()
	isListening = true
}
Object.assign( window, {

	deactivateAllSlices,
	activateAllSlices,
	activateRing,
	activateSlice,
	stopListening,
	startListening
})






    /////////////////
   //             //
  //   Loopage   //
 //             //
/////////////////



function animate(){

	tick ++
	if( isListening ){
		

		//  Process that audio data...
		//  First we need to copy the analyser’s current datastream
		//  into our prepared `frequencyData` array.
		//  Then we can start processing it.

		analyser.getByteFrequencyData( frequencyData )
		const processed = frequencyData


		//  We’re going to do two things at once:
		//  1. Discard any frequency bins that contains no signal.
		//  2. Create a new (smaller) collection that
		//     contains an [ amplitude, binIndex ] pair.

		.reduce( function( heap, amplitude, binIndex ){

			if( amplitude === 0 ) return heap//  Bail as quickly as possible.
			heap.push([ amplitude, binIndex ])
			return heap

		}, [])


		//  Sort the list by highest amplitudes, ie. element[ 0 ],
		//  then crop this list of highest amplitudes
		//  to the number of “banks” we’re keeping track of.

		.sort( function( a, b ){

			return b[ 0 ] - a[ 0 ]
		})
		.filter( function( item, i ){

			// console.log( i, item[ 0 ])
			return i < banksTotal
		})


		//  Now that we’re working with very few bins,
		//  we can relax (slightly)
		//  about the amount of computtaion we’re doing per loop.

		.reduce( function( heap, item, i ){

			const 
			amp  = item[ 0 ] / 255,
			hz   = item[ 1 ] * hzSpan,
			note = createFromHertz( hz )

			if( note ){
				
				note.amplitude = amp
				heap.push( note )
			}
			return heap
		
		}, [])





		//  Dim the canvas content over time.

		if( tick % 10 === 0 ){
			
			graphContext.fillStyle = 'hsl( 0 0% 0% / 0.1 )'
			graphContext.beginPath()
			graphContext.rect( 0, 0, graphCanvas.width, graphCanvas.height )
			graphContext.fill()
		}


		//  Scope

		const useDebugScope = false
		if( useDebugScope ){
			
			analyser.getByteTimeDomainData( timeDomainData )

			const 
			sliceWidth = graphCanvas.width / bufferLength,
			amplitudeMax = Array.from( frequencyData )
			.sort( function( a, b ){

				return b - a
			
			})[ 0 ],
			alpha = 0.1 + Math.min( Math.abs( amplitudeMax - 127 ) * 8 / 127, 0.9 )

			graphContext.clearRect( 0, 0, graphCanvas.width, graphCanvas.height )
			graphContext.strokeStyle = `hsla( 150, 25%, 90%, ${ alpha } )`
			graphContext.beginPath()
			let x = 0
			for( let i = 0; i <= bufferLength; i ++ ){

				const
				v = timeDomainData[ i ] / 127,
				y = v * graphCanvas.height / 2
				
				if( i === 0 ) graphContext.moveTo( x, y )
				else graphContext.lineTo( x, y )
				x += sliceWidth
			}
			graphContext.lineTo( graphCanvas.width, graphCanvas.height / 2 )
			graphContext.stroke()
		}


		//  Graph
		
		const useDebugBars = false
		if( useDebugBars ){

			const 
			barWidth = graphCanvas.width / analyser.frequencyBinCount,
			barWidthCeil = Math.ceil( barWidth )

			let barHeight, x = 0
			// graphContext.clearRect( 0, 0, graphCanvas.width, graphCanvas.height )
			for( let i = 0; i < analyser.frequencyBinCount; i ++ ){

				const norm = frequencyData[ i ] / 255
				// barHeight = Math.max( graphCanvas.height * 0.1, graphCanvas.height * norm )
				barHeight = graphCanvas.height * norm

				/*
				const 
				hue = i / analyser.frequencyBinCount * 150,
				gradient = graphContext.createLinearGradient( 

					0, 
					graphCanvas.height - barHeight, 
					0, 
					graphCanvas.height
				)
				gradient.addColorStop( 0.0, `hsla( ${ hue }, 100%, 50%, 1 )` )
				gradient.addColorStop( 0.5, `hsla( ${ hue },  90%, 50%, 1 )` )
				gradient.addColorStop( 1.0, `hsla( ${ hue },  90%, 50%, 0 )` )
				graphContext.fillStyle = gradient
				graphContext.fillRect(
					
					x,
					graphCanvas.height - barHeight,
					barWidthCeil,//barWidth,
					barHeight
				)
				*/

	/*
				const xFloor = Math.floor( x )


				graphContext.fillStyle = 'hsl( '+ ( i / analyser.frequencyBinCount * 150 ) +', 100%, 50% )'
				graphContext.fillRect(
					
					xFloor,
					graphCanvas.height - barHeight,
					barWidthCeil,//barWidth,
					barHeight
				)
	*/
				x += barWidth
			}
		}


		const 
		cx = graphCanvas.width  / 2,
		cy = graphCanvas.height / 2,
		ringWidth = cx / octaveRange,
		sliceWidth = TAU / 12,
		sliceWidthCents = sliceWidth / 100,
		tweenValue = 0.1,
		bounce = Math.sin( tick * 0.2 ) * 30
		
		deactivateAllSlices()
		processed.forEach( function( note, i ){

			if( i === 0 ){
				
				const
				radius = ( note.octaveIndex - octaveLowest + 0.5 ) * ringWidth + bounce,
				angle  = sliceWidth * note.nameIndex + sliceWidthCents * note.detuneCents - RA,
				x = cx + Math.cos( angle ) * radius,
				y = cy + Math.sin( angle ) * radius,
				alpha = note.amplitude * 2,
				xx = lerp( xPrior, x, tweenValue ),
				yy = lerp( yPrior, y, tweenValue )

				// console.log( 'alpha', alpha )

				graphContext.fillStyle = 'none'
				graphContext.strokeStyle = `rgb( 255 255 255 / ${ alpha * 0.8 })`
				graphContext.lineWidth = 2
				graphContext.beginPath()
				graphContext.moveTo( xPrior, yPrior )
				graphContext.lineTo( xx, yy )
				graphContext.stroke()
				xPrior = xx
				yPrior = yy

				// graphContext.strokeStyle = 'none'
				// graphContext.fillStyle = `rgb( 255 255 255 / ${ alpha })`
				// graphContext.beginPath()
				// graphContext.moveTo( xx, yy )
				// graphContext.arc( xx, yy, 4, 0, TAU, false )
				// graphContext.fill()
			}
			if( note.amplitude > 0.5 && 
				isBetween( note.octaveIndex, octaveLowest, octaveHighest )){
				
				activateSlice( note.nameIndex, note.octaveIndex )
				
			}
		})
	}
	requestAnimationFrame( animate )
}












window.addEventListener( 'DOMContentLoaded', function(){

	document.getElementById( 'start' )
	.addEventListener( 'mousedown', setup )
})

export default {

	REVISION,
	setup,
	getAudioContext: function(){

		return audioContext
	},
	// inspect
}
















// console.log( `


// ████    ███   ████   █   █  █   █   ███   █   █  █████
// █   █  █   █  █   █  █  █   █   █  █   █  █   █  █
// █   █  █████  ████   ███    █ █ █  █████  █   █  ████
// █   █  █   █  █   █  █  █   ██ ██  █   █   █ █   █
// ████   █   █  █   █  █   █  █   █  █   █    █    █████

// Revision ${ REVISION }



// ` )