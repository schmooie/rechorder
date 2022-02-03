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


  let dots = [];
  let chords = [];
  fretboard.render([]);

  function updateChordGuess() {
    let chordText = '🤔';

    if (dots.length >= 2) {
      chords = detect(dots.map(_ => _.note))
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

    const dotsToRender = [...dots];

    if (!dotsToRender.find((x) => x.fret === fret && x.string === string)) {
      dotsToRender.push(dot);
    }

    fretboard.setDots(dotsToRender).render();
  });

  fretboard.on('mouseleave', () => {
    $fretboard.classList.remove('show-moving-dot');
    fretboard.setDots(dots).render();
  });

  fretboard.on('mouseenter', () => {
    $fretboard.classList.add('show-moving-dot');
    fretboard.setDots(dots).render();
  });

  fretboard.on('click', ({ fret, string }) => {
    const note = fretboardNotes[string - 1][fret];
    const dot = {
      fret,
      string,
      note: note.substring(0, note.length - 1),
    };

    let removeDot = false;
    let replaceDot = false;
    let dotIndex = -1;

    for (let i = 0; i < dots.length; i++) {
      const currentDot = dots[i];

      if (currentDot.fret === fret && currentDot.string === string) {
        removeDot = true;
        dotIndex = i;
      }

      if (currentDot.string === string) {
        replaceDot = true;
        dotIndex = i;
      }
    }

    if (removeDot) {
      dots.splice(dotIndex, 1);
    } else if (replaceDot) {
      dots.splice(dotIndex, 1, dot);
    } else {
      dots.push(dot);
    }

    updateChordGuess();
    fretboard.setDots(dots).render();
  });

  document
    .querySelectorAll("button[data-action]")
    .forEach(button => {
      button.addEventListener("click", ({ currentTarget }) => {
        switch (currentTarget.dataset.action) {
          case "clear-fretboard":
            dots = [];
            fretboard.clear();
            break;
          default:
            break;
        }
      });
    });

  $clearButton.addEventListener('click', () => {
    dots = [];
    fretboard.setDots(dots).render();
    updateChordGuess();
  });

  $rechordButton.addEventListener('click', () => {
    if (dots.length < 2) {
      return;
    }

    const dotsMap = new Map(dots.map(({ fret, string }) => [string, fret]));
    const chordString = STRING_NUMBERS.reduce((chString, strNumber) => {
      const fret = dotsMap.get(strNumber);
      const selection = typeof fret === 'number' ? fret : 'x';

      return chString + selection;
    }, '');

    const $chordChart = document.createElement('div');
    const $figure = document.createElement('figure');
    const $figCaption = document.createElement('figcaption');

    console.log(chords.join(' '), chordString)
    createChordChart(chordString, $figure);
    $figCaption.textContent = chords.join(' ');
    $chordChart.className = 'chord-chart';
    $chordChart.append($figure);
    $figure.appendChild($figCaption);
    $rechordingSection.append($chordChart);
  });
})();


function createChordChart(chordString, el) {
  const fretboard = new Fretboard({
    el,
    width: 300,
    height: 200,
    bottomPadding: 0,
    scaleFrets: false,
    stringWidth: 2,
    fretWidth: 2,
    fretCount: 3,
    dotSize: 25,
    dotStrokeWidth: 3,
    fretNumbersMargin: 30,
    showFretNumbers: false
  })

  fretboard.renderChord(chordString);

  return fretboard;
}
