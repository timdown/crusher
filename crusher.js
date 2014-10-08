"use strict";

var crusher = (function() {
    // Exclude line breaks, backslash and quotes from available substitution character arrays
    var exclusionsRegex = /[\r\n'"\\\uD800-\uDFFF\u008F]/;
    
    function createCharacterArray(asciiOnly, includeControlCharacters) {
        var chars = [];
        
        // Order is upper case, lower case, numbers, others 
        var charRanges = [ [65, 90], [97, 122], [48, 57], [32, 47], [58, 64], [91, 96], [123, 127] ];
        if (includeControlCharacters) {
            charRanges.push( [1, 31] )
        }
        if (!asciiOnly) {
            charRanges.push( [128, 65535] )
        }
        for (var i = 0, charRange, j, charStr, maxCharCode; charRange = charRanges[i++]; ) {
            maxCharCode = charRange[1];
            for (j = charRange[0], charStr; j <= maxCharCode; ++j) {
                charStr = String.fromCharCode(j);
                if (!exclusionsRegex.test(charStr)) {
                    chars.push(charStr);
                }
            }
        }

        return chars;
    }
    
    function countOccurrences(str, sub, startIndex) {
        startIndex = startIndex || 0;
        var matchIndex;
        var subLen = sub.length;
        var occurrences = 0;
        
/*
        console.log(str, sub, startIndex);
        return 0;
*/
        while ((matchIndex = str.indexOf(sub, startIndex)) != -1) {
            startIndex = matchIndex + subLen;
            ++occurrences;
        }
        return occurrences;
    }

    function byteCount(i) {
        return unescape(encodeURI(i)).length;
    }
    
    function findNextReplacement(str) {
        var subLen, maxSubLen, charIndex, maxCharIndex, sub, subEndIndex, startCharIndex;
        var occurrences = {};
        var subs = [];
        var strLen = str.length;
        
        function Count(count) {
            this.count = count;
        }

        // Get occurrences for all substrings less than half the length of the string, smallest first
        for (subLen = 2, maxSubLen = strLen / 2; subLen <= maxSubLen; ++subLen) {
            // Get occurrences for all substrings of length subLen
            for (charIndex = 0, maxCharIndex = strLen - subLen; charIndex < maxCharIndex; ++charIndex) {
                subEndIndex = charIndex + subLen;
                sub = str.slice(charIndex, subEndIndex);
                if (!(occurrences[sub] instanceof Count)) {
                    occurrences[sub] = new Count( 1 + countOccurrences(str, sub, subEndIndex) );
                    subs.push(sub);
                }
            }
        }
        
        // Now, get the substring whose replacement with a single character will reduce the string length the most
        var i, count, score, bestScore = 0, bestScoreCount = 0, bestSub = null;
        for (i = 0; sub = subs[i++]; ) {
            count = occurrences[sub].count;
            if (count > 1) {
                score = (byteCount(sub) * (count - 1)) - (count + 2);
                if (score > bestScore || (score == bestScore && count < bestScoreCount)) {
                    bestScore = score;
                    bestScoreCount = count;
                    bestSub = sub;
                }
            }
        }
        
        return bestSub;
    }
    
    function crush(js, options) {
        var mergedOptions = {
            asciiOnly: true,
            includeControlCharacters: true,
            declareVariables: false
        };
        if (options) {
            for (var k in options) {
                if (options.hasOwnProperty(k)) {
                    mergedOptions[k] = options[k];
                }
            }
        }
        
        var chars = createCharacterArray(mergedOptions.asciiOnly, mergedOptions.includeControlCharacters);
        
        // Get the most popular type of quote to minimize escaping in the output string
        var quote = (countOccurrences(js, "'") < countOccurrences(js, '"')) ? "'" : '"';

        // Replace substrings with single characters while we still have free characters and worthwhile replacements
        var replacementChar;
        var replacementChars = [];
        var i = 0, sub, code = js;
        while ( (replacementChar = chars[i++]) && (sub = findNextReplacement(code)) ) {
            code = code.split(sub).join(replacementChar) + replacementChar + sub;
            replacementChars.unshift(replacementChar);
        }
        
        // Create the output
        var crushed = "x=" + quote + code.replace(/[\r\n\\]/g, "\\$&").replace(new RegExp(quote, "g"), "\\" + quote) + quote +
                      ";for(i in y=" + quote + replacementChars.join("") + quote + ")z=x.split(y[i]),x=z.join(z.pop());eval(x)";

        if (mergedOptions.declareVariables) {
            crushed = "var i,z,y," + crushed;
        }

        return crushed;
    }
    
    return {
        byteCount: byteCount,
        crush: crush
    };
})();