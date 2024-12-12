// script.js

document.addEventListener('DOMContentLoaded', () => {
    initAR();
    initializeGauges();
    simulateProductionBarChange();
});

function initAR() {
    const scene = document.querySelector("#a-scene");
    scene.style.display = "block";
}

function initializeGauges() {
    const gaugesGroup = document.getElementById("gauges-group");
    gaugesGroup.setAttribute("visible", "true");

    setInterval(() => {
        simulateGaugeChange('text-OEE', 'ring-OEE', getRandomValue(0, 100));
        simulateGaugeChange('text-Disponibilidade', 'ring-Disponibilidade', getRandomValue(0, 100));
        simulateGaugeChange('text-Performance', 'ring-Performance', getRandomValue(0, 100));
        simulateGaugeChange('text-Qualidade', 'ring-Qualidade', getRandomValue(0, 100));
    }, 10000);
}

function simulateGaugeChange(textId, ringId, currentValue) {
    let newValue = getRandomValue(0, 100);
    let step = (newValue - currentValue) / 100;

    const interval = setInterval(() => {
        if (Math.abs(newValue - currentValue) < Math.abs(step)) {
            currentValue = newValue;
            clearInterval(interval);
        } else {
            currentValue += step;
        }
        updateGauge(currentValue, textId, ringId);
    }, 100);
}

function updateGauge(value, textId, ringId) {
    const textEntity = document.getElementById(textId);
    const ringEntity = document.getElementById(ringId);

    if (textEntity && ringEntity) {
        textEntity.setAttribute('value', `${textId.split('-')[1]}: ${Math.round(value)}%`);
        ringEntity.setAttribute('color', `rgb(${255 - value}, ${value}, 0)`);
        ringEntity.setAttribute('theta-length', (value / 100) * 360);
    }
}

// function simulateProductionBarChange() {
//     let productionValue = 0;
//     const step = 1;

//     const interval = setInterval(() => {
//         productionValue = (productionValue >= 100) ? 0 : productionValue + step;
//         updateProductionBar(productionValue);
//     }, 100);
// }

// Track the currently active marker to prevent multiple detections
let activeMarker = null;

// Fetch machine data from the API
async function fetchMachineData(macAddress) {
    if (!macAddress) {
        console.log("MAC Address is undefined or empty");
        return null;
    }

    try {
        const intelmountAPIResponse = await fetch(`https://intelmount.apps.intelbras.com.br/v1/resources/mount?mac=${macAddress.trim()}`);

        if (intelmountAPIResponse.ok) {
            const data = await intelmountAPIResponse.json();
            console.log(data);

            return {
                cycletime: data?.data[0]?.orders?.currents[0]?.item?.factor,
                operationcode: data?.data[0]?.orders?.currents[0]?.operationId,
                quantity: data?.data[0]?.orders?.currents[0]?.production?.meta,
                quantityprod: data?.data[0]?.orders?.currents[0]?.production?.current,
                scrapquantity: data?.data[0]?.orders?.currents[0]?.production?.refuge,
                goodquantity: data?.data[0]?.orders?.currents[0]?.production?.current - data?.data[0]?.orders?.currents[0]?.production?.refuge,
                perf: data?.data[0]?.orders?.currents[0]?.perf,
                nextop: "5607040-2",
                rescode: data?.data[0]?.code,
                itemtool: data?.data[0]?.orders?.currents[0]?.item?.tool,
                item: `${data?.data[0]?.orders?.currents[0]?.item?.code} - ${data?.data[0]?.orders?.currents[0]?.item?.name}`
            };
        } else {
            console.log('Failed to fetch data from the API');
            return null;
        }
    } catch (error) {
        console.log('Error connecting to the API:', error);
        return null;
    }
}

async function handleMarkerDetection(markerId) {
    if (activeMarker) {
        console.log(`Another marker (${activeMarker}) is already being processed.`);
        return;
    }

    activeMarker = markerId;

    const markerElement = document.getElementById(markerId);
    const macAddress = markerElement?.getAttribute('data-mac');

    if (macAddress) {
        console.log(`MAC Address detected from marker ${markerId}: ${macAddress}`);
        const machineDetails = await fetchMachineData(macAddress);

        if (machineDetails) {
            // Update machine data components
            const components = ["cycletime", "operationcode", "quantity", "quantityprod", "scrapquantity", "goodquantity", "perf", "rescode", "itemtool", "item"];
            for (const component of components) {
                const element = document.getElementById(component);
                if (element) {
                    element.setAttribute("value", machineDetails[component]);
                }
            }

            // Update production bar dynamically
            updateProductionBarUI(machineDetails);
        }
    } else {
        console.log('No valid MAC address found for this marker');
    }

    activeMarker = null; // Reset active marker
}

// Handle marker loss and reset UI
function handleMarkerLoss(markerId) {
    console.log(`Marker ${markerId} lost. Stopping data fetch.`);
    if (activeMarker === markerId) {
        activeMarker = null;
        resetProductionBarUI();
    }
}

// Calculate production percentage
function calcProductionPercentage(machineDetails) {
    const { quantity, quantityprod, scrapquantity } = machineDetails;

    if (!quantityprod || !quantity) return 0; // Avoid division by zero

    const produced = quantityprod - (scrapquantity || 0);
    return Math.max(0, Math.min(100, ((produced / quantity) * 100).toFixed(2)));
}

// Update all machine data in the UI
function updateMachineDataUI(machineDetails) {
    const components = ["cycletime", "operationcode", "quantity", "quantityprod", "scrapquantity", "goodquantity", "perf", "rescode", "itemtool", "item"];
    components.forEach(component => {
        const element = document.getElementById(component);
        if (element) {
            element.setAttribute("value", machineDetails[component] || "N/A");
        }
    });
}

function updateProductionBarUI(machineDetails) {
    const percentage = calcProductionPercentage(machineDetails); // Calculate production percentage
    const barElement = document.getElementById("production-bar-fill");
    const percentageElement = document.getElementById("statusNum"); // Get the percentage display element

    if (barElement) {
        // Scale adjusts the length of the bar
        const fillScale = percentage / 100; // Scale length proportionally to percentage
        const maxBarLength = 2; // Maximum length of the bar
        const barLength = fillScale * maxBarLength; // Calculate actual bar length

        // Adjust the bar's start point (move to the right)
        const startOffset = 0.2; // Move start point to the right (increase this value for larger shifts)
        const newPositionX = (barLength / 2) - 1 + startOffset; // Adjust position to shift the origin

        // Adjust the bar's end point (move inward from the left)
        const endOffset = -0.2; // Reduce bar length from the left (negative value shrinks the end point)
        const adjustedBarLength = barLength + endOffset; // Adjusted bar length

        // Apply scale and position updates to the bar
        barElement.setAttribute("scale", `${adjustedBarLength} 0.1 0.1`);
        barElement.setAttribute("position", `${newPositionX} 0 0`);
    }

    if (percentageElement) {
        // Update the displayed percentage value
        percentageElement.setAttribute("value", `${percentage}%`);
        
        // Position the percentage element above the bar
        const percentageXOffset = startOffset; // Align with the start of the bar
        const percentageYPosition = 0.15; // Slightly above the bar
        percentageElement.setAttribute("position", `${percentageXOffset} ${percentageYPosition} 0`);
    }
}


// Reset the production bar UI to initial state
function resetProductionBarUI() {
    const barElement = document.getElementById("production-bar-fill");
    const percentageElement = document.getElementById("statusPercentage");

    if (barElement) barElement.setAttribute("scale", "0 0.1 0.1");
    if (percentageElement) percentageElement.setAttribute("value", "0%");
}

// Add event listeners for each registered marker
const registeredMarkers = ['machine1-marker', 'machine2-marker'];
registeredMarkers.forEach(markerId => {
    const markerElement = document.getElementById(markerId);
    if (markerElement) {
        markerElement.addEventListener('markerFound', () => handleMarkerDetection(markerId));
        markerElement.addEventListener('markerLost', () => handleMarkerLoss(markerId));
    }
});