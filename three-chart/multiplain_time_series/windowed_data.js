

var dataUrl = "https://prophecy.github.io/face_expression_chart/fea_sample_data/timeline_chart.json"

var samples = null
var sampleList = []
var windowedData = []

export function requestSamples(callback) {

    console.log("Start to request samples.")

    $.ajax({
        url: dataUrl,
        error: function(xhr, status, error) {
            var err = eval("(" + xhr.responseText + ")")
            alert(err.Message)
        },
        success: function(response) {
            
            console.log("Request samples finished")

            //console.log(response)
            samples = response

            // Clear sample list
            sampleList = []

            // Convert samples to sample list
            if (!!samples) {

                const len = Object.keys(samples).length
                
                console.log("Sample length: " + len)

                for (var i=0; i<len; ++i) {

                    var itStr = i.toString()
                    var itVal = {}

                    if (itStr in samples)
                        itVal = samples[itStr]

                    sampleList.push(itVal);
                }
            }

            // Return through callback
            callback(sampleList)
        }
    })
}

export function getSampleLength() {

    if (!samples)
        return 0;

    return Object.keys(samples).length
}

export function getWindowedData(min, max, callback) {
    
    const len = getSampleLength()

    // Clamp max and min [0, len] | if max <=> min then empty
    const clampMin = (min <= len ? min : len) >= 0 ? min : 0
    const clampMax = (max <= len ? max : len) > min ? max : min

    // Clear windowed data
    windowedData = []

    // Push to windowed data
    for (var i=clampMin; i<clampMax; ++i)
        windowedData.push(sampleList[i])

    // Return to callback
    callback(windowedData)
}