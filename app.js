// Word learner 
const debugMode = true;

var wordController = (function () {

    let id = 0;

    var Word = function (english, hungarian, example) {
        this.english = english;
        this.hungarian = hungarian;
        this.example = example;
        this.weight = 0;
        this.id = id;
    }

    var dict = {
        words: [],
    }

    return {
        addWord: function (english, hungarian, example) {
            newWord = new Word(english, hungarian, example, id);
            dict.words.push(newWord);
            id = id + 1;
        },

        removeWord: function (id) {
            const removeIndex = dict.words.map(function (item) { return item.id; }).indexOf(id);
            dict.words.splice(removeIndex, 1);
        },

        askAWord: function () {
            if (dict.words.length != 0) {
                var item = Math.floor(Math.random() * dict.words.length);
                return dict.words[item];
            } else return -1;
        },

        isDictionaryEmpty: function () {
            if (dict.words.length == 0) return true;
            else return false;
        },

        queryDictionarySize: function () {
            return dict.words.length;
        },

        queryProgress: function (original) {
            let progress;
            return progress;
        },

        speakWorld: function (word) {
            var msg = new SpeechSynthesisUtterance();
            var voices = window.speechSynthesis.getVoices();
            msg.voice = voices[localStorage.getItem('voices')];
            msg.text = word;
            speechSynthesis.speak(msg);
        },

        cleanDict: function () {
            dict.words = [];
        },

        getWords: function () {
            return dict.words;
        }
    }
})();

var uiController = (function () {
    var DOMstrings = {
        checkButton: '.check-btn',
        questionLabel: '.question_label',
        answer: '.answer',
        form: '#word-form',
        settings: 'settings',
        selected: 'selected',
        currentWordWeight: '#currentWordWeight',
        dictProgressBar: '#dictProgressBar',
        progressBarLabel: '#progressBarLabel',
        dictName: '#dictName'
    }

    return {

        getInput: function () {
            return document.querySelector(DOMstrings.answer).value
        },

        showWord: function (obj) {
            document.querySelector(DOMstrings.questionLabel).textContent = obj.hungarian;
            document.querySelector(DOMstrings.answer).value = "";
            document.querySelector(DOMstrings.answer).focus();
        },

        setDictionaryName(name) {
            document.querySelector(DOMstrings.dictName).textContent = name;
        },

        updateProgess(current, original) {
            let percentage = Math.round(current / original * 100);
            if (percentage < 3) percentage = 3 //Bootstrap recommended min. value
            document.querySelector(DOMstrings.dictProgressBar).style = `width: ${percentage}%;`;
            document.querySelector(DOMstrings.progressBarLabel).textContent = current + "/" + original;
        },

        updateWordWeight(value) {
            document.querySelector(DOMstrings.currentWordWeight).textContent = value;
        },

        showInfo: function (text, type, buttonType) {
            output = `
                <div id="infoBoxElement" class="alert alert-${type} mt-2" role="alert">${text}`
            switch (buttonType) {
                case 'reload':
                    output+=`<button id ="resetBtn" type="button" class="btn btn-${type}">Újrakezd</button></div>`
                    document.querySelector('.info-box').innerHTML = output;
                    console.log(document.getElementById('resetBtn'))
                    document.getElementById('resetBtn').focus();
                    break;
                default:
                    output+=`<button id ="okBtn" type="button" class="btn btn-${type}">Ok</button></div>`
                    document.querySelector('.info-box').innerHTML = output;
                    document.getElementById('okBtn').focus();
            } 
        },

        removeInfo: function () {
            document.querySelector('#infoBoxElement').remove();
            document.getElementById('checkBtn').disabled = false;
        },

        getDOMStrings: function () {
            return DOMstrings;
        }
    }
})();

var controller = (function (wordCtrl, UICtrl) {

    let word;
    let originalDictSize = wordCtrl.queryDictionarySize();

    var setupEventListeneres = function () {
        var DOM = UICtrl.getDOMStrings();

        document.querySelector(DOM.form).addEventListener('submit', checkWord);
        document.querySelector('.info-box').addEventListener('click', giveNextWorld)

        document.getElementById('voiceSelect').addEventListener('change', function () {
            console.log(this.options[this.selectedIndex].getAttribute('data-name'));
            var msg = new SpeechSynthesisUtterance();
            var voices = window.speechSynthesis.getVoices();
            console.log([this.selectedIndex]);
            msg.voice = voices[this.selectedIndex]; // Note: some voices don't support altering params
            msg.text = 'Hello World';
            speechSynthesis.speak(msg);
            localStorage.setItem('voices', this.selectedIndex)
        });

        document.getElementById('dicts').addEventListener('click', function (e) {
            UICtrl.setDictionaryName(e.target.innerHTML);
            fetch(e.target.id)
                .then(function (res) {
                    return res.json();
                })
                .then(function (data) {
                    //Jelenlegi szótár eldobása
                    wordCtrl.cleanDict();

                    //Szótár feltöltése új fájlokkal
                    data.forEach(function (dict) {
                        wordController.addWord(dict.english, dict.hungarian)
                        if (debugMode) console.log(dict);
                    })
                    originalDictSize = wordCtrl.queryDictionarySize();
                    UICtrl.updateProgess(originalDictSize - wordCtrl.queryDictionarySize(), originalDictSize);
                    document.getElementById('checkBtn').disabled = false;
                    nextWord();
                })
                .catch(function (err) {
                    console.log(err);
                })
        })
    }

    function giveNextWorld(e) {
        if (e.target.id == 'okBtn') {
            UICtrl.removeInfo();
            nextWord();
            document.getElementById('checkBtn').disabled = false;
        } else {
            location.reload();
        }

    }

    function getDictionaries() {
        fetch('dictionaries.json')
            .then(function (res) {
                return res.json();
            })
            .then(function (data) {
                let output = '';
                data.forEach(function (dict) {
                    output += `<a id="${dict.resourceFile}"class="dropdown-item" href="#">${dict.title}</a>`
                })
                document.getElementById('dicts').innerHTML = output;
            })
    }

    function populateVoiceList() {
        if (typeof speechSynthesis === 'undefined') {
            return;
        }

        voices = speechSynthesis.getVoices();

        for (i = 0; i < voices.length; i++) {
            var option = document.createElement('option');
            option.textContent = voices[i].name + ' (' + voices[i].lang + ')';

            if (voices[i].default) {
                option.textContent += ' -- DEFAULT';
            }

            option.setAttribute('data-lang', voices[i].lang);
            option.setAttribute('data-name', voices[i].name);
            document.getElementById("voiceSelect").appendChild(option);
        }
    }

    var checkWord = function (e) {
        document.getElementById('checkBtn').disabled = true;
        var answer = UICtrl.getInput();
        wordCtrl.speakWorld(word.english);
        if (answer === word.english) {
            UICtrl.showInfo("Helyes válasz!", 'info', 'ok');
            word.weight++;
            if (word.weight === 3) {
                wordCtrl.removeWord(word.id);
                UICtrl.updateProgess(originalDictSize - wordCtrl.queryDictionarySize(), originalDictSize);
            }
            
        } else {
            UICtrl.showInfo("Rossz válasz, a helyes válasz: " + word.english, 'warning', 'ok');
            word.weight--;
        }
        (event.preventDefault) ? event.preventDefault() : event.returnValue = false;
    }

    var nextWord = function () {
        word = wordController.askAWord();
        if (word != -1) {
            UICtrl.showWord(word);
            UICtrl.updateWordWeight(word.weight);
        } else UICtrl.showInfo("Minden szót megtanultál! Válassz másik szótárat.", 'success', 'reload');;
    }

    return {
        init: function () {
            console.log("Application starting...");
            console.log(`Debug mode is ${debugMode}`);

            setupEventListeneres();
            getDictionaries();
            populateVoiceList();
            document.getElementById('checkBtn').disabled = true
            if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = populateVoiceList;
            }
        }
    }

})(wordController, uiController);

controller.init();