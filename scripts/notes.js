import { 
	
	isUsefulNumber,
	isNotUsefulNumber,
	isNotUsefulInteger,
	isNotBetween

} from './maths.js'






    ///////////////
   //           //
  //   Names   //
 //           //
///////////////


//  Ah, the joys of note naming…
//  Why are the piano’s natural notes in C major and not A major?
//  	https://www.youtube.com/watch?v=NRDwrKMan_Q&t=311s
//  	https://www.youtube.com/watch?v=5B_5N2M7SXQ&t=568s
//      https://en.wikipedia.org/wiki/Clavichord
//  Most countries don’t use ABCDEFG for note names (Solfège): 
//		https://www.youtube.com/watch?v=MVA8bgSBt5A
//  We are purposely _not_ relating note names to frequencies here!

//  Already off to a bad start LOL. 
//  Because as a shortcut we are assuming that relationships 
//  like D♯ and E♭ are the same.
//  THEY ARE NOT! At least, not always.
//    https://github.com/stewdio/beep.js/issues/2
//	  http://everything2.com/title/The+difference+between+tritone%252C+augmented+fourth%252C+diminished+fifth%252C+%252311+and+b5

//  We ough to map our notes according to C major (and not A as the fundamental note)
//  because most of the world uses Solfège (“fixed Do”), 
//  where “Do” corresponds directly to C and not any arbitrary note (which would be “relative Do”).

const
noteNamesSolfege = 'Do Do♯ Re Mi♭ Mi Fa Fa♯ Sol Sol♯ La La♯ Si'.split(' '),
noteNamesEnglish = 'C C♯ D E♭ E F F♯ G G♯ A A♯ B'.split(' '),
noteNamesGerman  = 'C C♯ D E♭ E F F♯ G G♯ A A♯ H'.split(' ')






    ////////////////
   //            //
  //   EDO 12   //
 //            //
////////////////


// “EDO12” = Equal Division of Octave into 12 units.
//           ↑     ↑           ↑           ↑↑
//  The Cent is a logarithmic unit of measure that divides
//  the 12-tone equal temperament octave into 12 semitones 
//  of 100 cents each.
//  http://en.wikipedia.org/wiki/Cent_(music)

//   + 0¢  UNISON
//   100¢  minor   2nd
//   200¢  MAJOR   2nd
//   300¢  minor   3rd
//   400¢  MAJOR   3rd
//   500¢  PERFECT 4th
//   600¢  tritone
//   700¢  PERFECT 5th
//   800¢  minor   6th
//   900¢  MAJOR   6th
//  1000¢  minor   7th
//  1100¢  MAJOR   7th
//  1200¢  OCTAVE

const
noteWidth = Math.pow( 2, 1 / 12 ),
centWidth = Math.pow( 2, 1 / 1200 ),

defaultA4Hz =   440.0,//  A4
hzMinimum   =    27.5,//  A0
hzMaximum   = 14080.0,//  A9

c4MapIndex = 12 * 4,//  C3,
a4MapIndex = c4MapIndex + 9,
noteIndexToEDO12Hz = function( noteIndex, a4Hz ){
	
	if( isNotUsefulInteger( noteIndex )) return null
	if( isNotUsefulNumber( a4Hz )) a4Hz = defaultA4Hz
	return a4Hz * Math.pow( noteWidth, noteIndex - a4MapIndex )
}






    //////////////
   //          //
  //   Just   //
 //          //
//////////////


//  Just Intonation: The most mathematically beautiful tuning.
//  Makes for sonically gorgeous experiences … until you change keys!
//  https://www.youtube.com/watch?v=oIFLtNYI3Ls

const noteIndexToJustHz = function( noteIndex, key ){

	var 
	that = this,
	relationshipIndex

	params = Note.validateWestern( params )
	params.tuning = 'JustIntonation'
	params.key = new Note.EDO12( key )


	//  This is Ptolemy’s “Intense Diatonic Scale” which is based on 
	//  Pythagorean tuning. It is but one example of Just Intonation.
	//  http://en.wikipedia.org/wiki/Ptolemy%27s_intense_diatonic_scale
	//  http://en.wikipedia.org/wiki/Pythagorean_tuning
	//  http://en.wikipedia.org/wiki/List_of_pitch_intervals
	//  http://www.chrysalis-foundation.org/just_intonation.htm 

	relationshipIndex = ( params.nameIndex - params.key.nameIndex ) % 12
	if( relationshipIndex < 0 ) relationshipIndex += 12
	params.hertz = [

		params.key.hertz,          //  Do  UNISON
		params.key.hertz * 16 / 15,//      minor     2nd
		params.key.hertz *  9 /  8,//  Re  MAJOR     2nd
		params.key.hertz *  6 /  5,//      minor     3rd
		params.key.hertz *  5 /  4,//  Mi  MAJOR     3rd
		params.key.hertz *  4 /  3,//  Fa  PERFECT   4th
		params.key.hertz * 45 / 32,//      augmented 4th
		params.key.hertz *  3 /  2,//  Sol PERFECT   5th
		params.key.hertz *  8 /  5,//      minor     6th
		params.key.hertz *  5 /  3,//  La  MAJOR     6th
		params.key.hertz * 16 /  9,//      minor     7th (HD, baby!)
		params.key.hertz * 15 /  8,//  Si  MAJOR     7th
		params.key.hertz *  2      //  Do  OCTAVE
	
	][ relationshipIndex ]


	//  If the key’s octave and our desired note’s octave were equal
	//  then we’d be done. Otherwise we’ve got to bump up or down our 
	//  note by whole octaves.
	
	params.hertz = params.hertz * Math.pow( 2, params.octaveIndex - params.key.octaveIndex )
	return new Note( params )
}






    ///////////////
   //           //
  //   Notes   //
 //           //
///////////////


//  In theory, an _infinite_ number of octaves exist, right?
//  But in practice, a limited set of octaves (in this case, 10)
//  gives us guardrails to reason around / do faster computation with later. 

//  See also, “Boîte Diabolique”
//  https://www.youtube.com/watch?v=mE0takm9TX0


const notesMap = 
new Array( 12 * 10 )//  Creating a library of 120 notes; 10 octaves of 12 notes each.
.fill( 1 )
.map( function( discard, noteIndex ){

	const 
	octaveIndex = Math.floor( noteIndex / 12 ),
	mod12  = noteIndex % 12,
	name   = noteNamesEnglish[ mod12 ],//  Yes, this is imperialism. 
	letter = name.substr( 0, 1 ),       //  Pick your battles.
	nameHasSharp = name.includes( '♯' ),
	nameHasFlat  = name.includes( '♭' )


	//  We’re going to assume an 88-key piano keyboard,
	//  beginning with A0 and proceeding up to include C8.

	let
	pianoKeyIndex = null,
	midiIndex = null

	if( noteIndex >= 9 && 
		noteIndex <= 9 + 87 ){//  A0 … C8.
	
		pianoKeyIndex = noteIndex - 9
		midiIndex = pianoKeyIndex + 21
	}
	
	return {

		noteIndex,
		octaveIndex,
		nameIndex: mod12,
		name,
		letter,
		
		nameEnglish: noteNamesEnglish[ mod12 ],
		nameGerman:  noteNamesGerman[  mod12 ],
		nameSolfege: noteNamesSolfege[ mod12 ],

		nameHasSharp,
		nameHasFlat,
		nameHasNatural: !nameHasSharp && !nameHasFlat,
		nameModifier: nameHasSharp ? '♯' : ( nameHasFlat ? '♭' : '♮' ),

		a4Hz: defaultA4Hz,
		pianoKeyIndex,
		midiIndex,
		isMiddleC:  noteIndex === c4MapIndex,
		isConcertA: noteIndex === a4MapIndex,
		edo12Hz: noteIndexToEDO12Hz( noteIndex ),
		justHz : null,//noteIndexToJustHz( noteIndex, key )
		
		inputHz:        null,
		inputIsSharp:   null,
		inputIsFlat:    null,
		inputIsPerfect: null
	}
}),
mapLowest    = notesMap[ 0 ],
pianoLowest  = notesMap[ 9 ],
middleC      = notesMap[ c4MapIndex ],
concertA     = notesMap[ a4MapIndex ],
pianoHighest = notesMap[ 9 + 87 ],
mapHighest   = notesMap[ notesMap.length - 1 ]






    ///////////////
   //           //
  //   Tuner   //
 //           //
///////////////


//  You give us a frequency in Hz,
//  we’ll give you a valid western music note object!

function createFromHertz( inputHz, a4Hz ){

	if( isNotUsefulNumber( inputHz )) return null
	if( isNotUsefulNumber( a4Hz )) a4Hz = defaultA4Hz
	if( isNotBetween( inputHz, hzMinimum, hzMaximum )) return null
	if( isNotBetween( a4Hz, hzMinimum, hzMaximum )) return null


/*

can all below just be replaced with this?????


// const noteNames = 'C C# D D# E F F# G G# A A# B'.split(' ')
function getNoteNumberFromFrequencyHz( frequencyHz ){
	
	const noteNumber = 12 * ( Math.log( frequencyHz / 440 ) / Math.log( 2 ))
	return Math.round( noteNumber ) + 69
}
function getFrequencyHzFromNoteNumber( noteNumber ){

	return 440 * Math.pow( 2, ( noteNumber - 69 ) / 12 )
}
function getDetuneCents( frequencyHz, noteNumber ){

	return Math.floor( 

		1200 * Math.log( frequencyHz / getFrequencyHzFromNoteNumber( noteNumber )) / Math.log( 2 )
	) 
}

*/



	const
	FLAT  = -1,
	SHARP =  1
	
	let 
	cursorHz = a4Hz,
	noteindex = 0,
	centIndex = 0,
	detuneDirection = 0

	if( inputHz >= cursorHz ){
		
		while( inputHz >= noteWidth * cursorHz ){
			
			cursorHz = noteWidth * cursorHz
			noteindex ++
		}
		while( inputHz > centWidth * cursorHz ){
			
			cursorHz = centWidth * cursorHz
			centIndex ++
		}
		if( centWidth * cursorHz - inputHz < inputHz - cursorHz ) centIndex ++
		if( centIndex > 50 ){

			noteindex ++
			centIndex = 100 - centIndex
			if( centIndex != 0 ) detuneDirection = FLAT
			else detuneDirection = SHARP
		}
		else detuneDirection = SHARP
	}
	else {
		
		while( inputHz <= cursorHz / noteWidth ){
			
			cursorHz = cursorHz / noteWidth
			noteindex --
		}
		while( inputHz < cursorHz / centWidth ){
			
			cursorHz = cursorHz / centWidth
			centIndex ++
		}
		if( inputHz - cursorHz / centWidth < cursorHz - inputHz ) centIndex ++
		if( centIndex >= 50 ){
			
			noteindex --
			centIndex = 100 - centIndex
			detuneDirection = SHARP
		}
		else {
			
			if( centIndex != 0 ) detuneDirection = FLAT
			else detuneDirection = SHARP
		}
	}
	const note = Object.create( notesMap[ a4MapIndex + noteindex ])
	Object.assign( note, {

		inputA4Hz: a4Hz,
		inputHz,
		detuneCents: centIndex * detuneDirection,
		detuneHz:  inputHz  -  note.edo12Hz,
		isSharp:   inputHz  >  note.edo12Hz,
		isFlat:    inputHz  <  note.edo12Hz,
		isPerfect: inputHz === note.edo12Hz
	})
	return note
}




window.createFromHertz = createFromHertz











export {

	noteIndexToEDO12Hz,
	noteIndexToJustHz,
	notesMap,
	middleC,
	concertA,
	createFromHertz
}