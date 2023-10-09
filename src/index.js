import { Fretboard } from '@moonwave99/fretboard.js';
import { get as getScale } from '@tonaljs/scale';
import { detect } from "@tonaljs/chord-detect";

import '@/styles/index.scss'
import { fretboardConfiguration, colors } from './js/config';

const STRING_NUMBERS = [6,5,4,3,2,1];

(function main() {
  const $fretboard = document.querySelector('#fretboard');
  const $chordSpan = document.querySelector('#chord');
  const $clearButton = document.querySelector('#clear');
  const $rechordButton = document.querySelector('#rechord');
  const $rechordingSection = document.querySelector('#rechordings');

  const fretboardNotes = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'].reverse().map(note => {
    const [noteName, octave] = note.split('');
    return [
      ...getScale(`${note} chromatic`).notes,
      ...getScale(`${noteName}${+octave + 1} chromatic`).notes
    ];
  });

  const fretboard = new Fretboard({
    ...fretboardConfiguration,
    el: $fretboard,
    dotText: ({ note }) => note,
    dotStrokeColor: ({ moving }) => moving ? colors.defaultActiveStroke : colors.defaultStroke
  });

  const FRETTED_MAP = new Map([
    [0, null],
    [1, null],
    [2, null],
    [3, null],
    [4, null],
    [5, null],
  ]);

  function getFrettedDots() {
    return [...FRETTED_MAP.values()].filter(_ => !!_);
  }

  let chords = [];
  fretboard.render([]);

  function updateChordGuess() {
    const frettedDots = getFrettedDots();
    let chordText = '🤔';

    if (frettedDots.length >= 2) {
      chords = detect(frettedDots.sort((a, b) => a.string > b.string ? -1 : 1).map(_ => _.note))
        // normalize GM -> G
        .map(chordName =>
          chordName[chordName.length - 1] === 'M' ? chordName.substr(0, chordName.length - 1) : chordName
        );

      if (!chords.length) {
        chordText = 'This is something very jazzy 🤷‍♂️';
      } else {
        chordText = chords.reduce((text, chordName, index, arr) => {
          const newChunk = index === arr.length - 1 ? chordName : `${chordName} or`;

          return `${text} ${newChunk}`;
        }, 'This is')
      }

    }

    $chordSpan.textContent = chordText;
  }

  fretboard.on('mousemove', ({ fret, string }) => {
    const note = fretboardNotes[string - 1][fret];
    const dot = {
      fret,
      string,
      note: note.substring(0, note.length - 1),
      moving: true
    };

    const dotsToRender = getFrettedDots();

    if (!dotsToRender.find((x) => x.fret === fret && x.string === string)) {
      dotsToRender.push(dot);
    }

    fretboard.setDots(dotsToRender).render();
  });

  fretboard.on('mouseleave', () => {
    $fretboard.classList.remove('show-moving-dot');
    fretboard.setDots(getFrettedDots()).render();
  });

  fretboard.on('mouseenter', () => {
    $fretboard.classList.add('show-moving-dot');
    fretboard.setDots(getFrettedDots()).render();
  });

  fretboard.on('click', ({ fret, string }) => {
    const note = fretboardNotes[string - 1][fret];
    const dot = {
      fret,
      string,
      note: note.substring(0, note.length - 1),
    };

    const removeDot = [...FRETTED_MAP.values()].some((frettedNote) =>
      frettedNote?.fret === fret && frettedNote?.string === string
    );

    if (removeDot) {
      FRETTED_MAP.set(string - 1, null);
    } else {
      FRETTED_MAP.set(string - 1, dot);
    }

    fretboard.setDots(getFrettedDots()).render();
    updateChordGuess();
  });

  document
    .querySelectorAll("button[data-action]")
    .forEach(button => {
      button.addEventListener("click", ({ currentTarget }) => {
        switch (currentTarget.dataset.action) {
          case "clear-fretboard":
            fretboard.clear();
            break;
          default:
            break;
        }
      });
    });

  $clearButton.addEventListener('click', () => {
    FRETTED_MAP.clear();
    fretboard.setDots(getFrettedDots()).render();
    updateChordGuess();
  });

  $rechordButton.addEventListener('click', () => {
    const frettedDots = getFrettedDots();
    if (frettedDots.length < 2) {
      return;
    }

    const dotsMap = new Map(frettedDots.map(({ fret, string }) => [string, fret]));
    const chordString = STRING_NUMBERS.reduce((chString, strNumber) => {
      const fret = dotsMap.get(strNumber);
      const selection = typeof fret === 'number' ? fret : 'x';
      const delimeter = chString.length > 0 ? '-' : '';

      return chString + delimeter + selection;
    }, '');

    const $chordChart = document.createElement('div');
    const $figure = document.createElement('figure');
    const $figCaption = document.createElement('figcaption');

    createChordChart(chordString, $figure);
    $figCaption.textContent = chords.join(' ');
    $chordChart.className = 'chord-chart';
    $chordChart.append($figure);
    $figure.appendChild($figCaption);
    $rechordingSection.append($chordChart);
  });
})();


function createChordChart(chordString, el) {
  let lowestFretNum = Infinity;
  let highestFretNum = -Infinity;

  const chordFrets = chordString.split('-');

  for (let i = 0; i < chordFrets.length; i++) {
    const curFretNum = parseInt(chordFrets[i]);

    if (!isNaN(curFretNum)) {
      highestFretNum = Math.max(highestFretNum, curFretNum);
      lowestFretNum = Math.min(lowestFretNum, curFretNum);
    }
  }

  const fretboard = new Fretboard({
    el,
    width: 300,
    height: 200,
    bottomPadding: 0,
    scaleFrets: false,
    stringWidth: 2,
    fretWidth: 2,
    fretCount: highestFretNum - lowestFretNum + 1,
    dotSize: 25,
    dotStrokeWidth: 3,
    fretNumbersMargin: 30,
    showFretNumbers: true,
    crop: true
  })

  fretboard.renderChord(chordString);

  return fretboard;
}

