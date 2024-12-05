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

function simulateProductionBarChange() {
    let productionValue = 0;
    const step = 1;

    const interval = setInterval(() => {
        productionValue = (productionValue >= 100) ? 0 : productionValue + step;
        updateProductionBar(productionValue);
    }, 100);
}

function updateProductionBar(value) {
    const barFill = document.getElementById("production-bar-fill");
    if (barFill) {
        const fillScale = value / 100;
        barFill.setAttribute("scale", `${fillScale * 1.3} 0.1 0.1`);
        barFill.setAttribute("position", `${(fillScale * 1.3 / 2) - 0.65} 0 0`);
    }
}

// Function to fetch machine data from the API
async function fetchMachineData(macAddress) {
    // Check if macAddress is defined and not empty
    if (!macAddress) {
        console.log("MAC Address is undefined or empty");
        return null;
    }

    try {
        const intelmountAPIResponse = await fetch(`https://intelmount.apps.intelbras.com.br/v1/resources/mount?mac=${macAddress.trim()}`);

        if (intelmountAPIResponse.ok) {
            const data = await intelmountAPIResponse.json();
            console.log(data);

            // Extract machine details
            const machineDetails = {
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

            return machineDetails;
        } else {
            console.log('Failed to fetch data from the API');
            return null;
        }
    } catch (error) {
        console.log('Error connecting to the API:', error);
        return null;
    }
}

let activeMarker = null;  // Track the currently active marker to prevent multiple detections

// Function to fetch machine data from the API
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

            const machineDetails = {
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

            return machineDetails;
        } else {
            console.log('Failed to fetch data from the API');
            return null;
        }
    } catch (error) {
        console.log('Error connecting to the API:', error);
        return null;
    }
}

// Function to handle marker detection and update machine data
async function handleMarkerDetection(markerId) {
    // Only proceed if no other marker is being processed
    if (activeMarker) {
        console.log(`Another marker (${activeMarker}) is already being processed.`);
        return;
    }

    // Mark this marker as the active one
    activeMarker = markerId;

    // Get the marker element
    const markerElement = document.getElementById(markerId);
    const macAddress = markerElement?.getAttribute('data-mac');

    if (macAddress) {
        console.log(`MAC Address detected from marker ${markerId}: ${macAddress}`);

        const machineDetails = await fetchMachineData(macAddress);

        if (machineDetails) {
            const components = ["cycletime", "operationcode", "quantity", "quantityprod", "scrapquantity", "goodquantity", "perf", "rescode", "itemtool", "item"];
            for (const component of components) {
                const element = document.getElementById(component);
                if (element) {
                    element.setAttribute("value", machineDetails[component]);
                }
            }
        }
    } else {
        console.log('No valid MAC address found for this marker');
    }

    // Reset the active marker after the detection process is finished
    activeMarker = null;
}

// Function to handle marker loss
function handleMarkerLoss(markerId) {
    console.log(`Marker ${markerId} lost. Stopping data fetch.`);
    // Reset the active marker if it was previously active
    if (activeMarker === markerId) {
        activeMarker = null;
    }
}

// Add event listeners for each registered marker
const registeredMarkers = ['machine1-marker', 'machine2-marker']; // Add more as needed

registeredMarkers.forEach(markerId => {
    const markerElement = document.getElementById(markerId);
    if (markerElement) {
        markerElement.addEventListener('markerFound', () => handleMarkerDetection(markerId));
        markerElement.addEventListener('markerLost', () => handleMarkerLoss(markerId));
    }
});
