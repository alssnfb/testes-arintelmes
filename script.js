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

async function processDataAndInitializeGauges(macAddress) {
    // Wait for fetchMachineData to complete
    const machineData = await fetchMachineData(macAddress);

    if (machineData) {
        console.log("Machine data fetched successfully. Initializing gauges...");
        
        // Initialize gauges only if data exists
        initializeGauges(machineData);
    } else {
        console.log("No data fetched. Gauges will not be initialized.");
    }
}

function initializeGauges(data) {
    const gaugesGroup = document.getElementById("gauges-group");
    gaugesGroup.setAttribute("visible", "true"); // Make gauges visible

    // Use data from the API to set initial values
    updateGauge(data.perf || 0, 'text-OEE', 'ring-OEE');
    updateGauge(data.quantity || 0, 'text-Disponibilidade', 'ring-Disponibilidade');
    updateGauge(data.scrapquantity || 0, 'text-Performance', 'ring-Performance');
    updateGauge(data.goodquantity || 0, 'text-Qualidade', 'ring-Qualidade');
}

function updateGauge(value, textId, ringId) {
    const textEntity = document.getElementById(textId);
    const ringEntity = document.getElementById(ringId);

    if (textEntity && ringEntity) {
        textEntity.setAttribute('value', `${textId.split('-')[1]}: ${Math.round(value)}%`);
        ringEntity.setAttribute('color', `rgb(${255 - value}, ${value}, 0)`); // Red to green gradient
        ringEntity.setAttribute('theta-length', (value / 100) * 360);
    }
}

// Track the currently active marker to prevent multiple detections
let activeMarker = null;
// Stores the last detected machine details
let lastDetectedMachineDetails = null; 

// Fetch machine data from the API
async function fetchMachineData(macAddress) {
    if (!macAddress) {
        console.log("MAC Address is undefined or empty");
        return null;
    }

    try {
        const intelmountAPIResponse = await fetch(`https://intelmount.apps.intelbras.com.br/v1/resources/mount?mac=${macAddress.trim()}`);

        if (intelmountAPIResponse.ok) {
            const components = [
                "cycletime", "operationcode", "quantity", "quantityprod",
                "scrapquantity", "goodquantity", "perf", "nextop", "rescode",
                "itemtool", "item", "status"
            ];
            const data = await intelmountAPIResponse.json();
            const status = data?.data[0]?.status;
            const stopDetails = data?.data?.[0]?.stopDetails?.[0]? { color: data.data[0].stopDetails[0].color, name: data.data[0].stopDetails[0].name }: null;
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

            for (const component of components) {
                const element = document.getElementById(component);
                if (element) {
                    element.setAttribute("value", machineDetails[component]);
                }
            }

            // Update machine status
            updateMachineStatus(status, stopDetails, machineDetails);

            // Return the complete machineDetails object
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
            // Save details to global variable
            lastDetectedMachineDetails = machineDetails;

            // Update machine data components
            const components = [
                "cycletime", "operationcode", "quantity", "quantityprod",
                "scrapquantity", "goodquantity", "perf", "rescode", "itemtool", "item"
            ];
            for (const component of components) {
                const element = document.getElementById(component);
                if (element) {
                    element.setAttribute("value", machineDetails[component]);
                }
            }

            // Call initTime with the fetched resCode if available
            if (machineDetails.rescode) {
                console.log(`Initializing time for resCode: ${machineDetails.rescode}`);
                await initTime(machineDetails.rescode);
            } else {
                console.error('No valid resCode found in machineDetails.');
            }

            // Update production bar dynamically
            updateProductionBarUI(machineDetails);
        }
    } else {
        console.log('No valid MAC address found for this marker');
    }

    activeMarker = null; // Reset active marker
}

function handleMarkerLoss(markerId) {
    console.log(`Marker ${markerId} lost. Retaining last detected data.`);
    if (activeMarker === markerId) {
        activeMarker = null;

        if (lastDetectedMachineDetails) {
            // Retain the displayed data
            const components = [
                "cycletime", "operationcode", "quantity", "quantityprod",
                "scrapquantity", "goodquantity", "perf", "rescode", "itemtool", "item"
            ];
            for (const component of components) {
                const element = document.getElementById(component);
                if (element) {
                    element.setAttribute("value", lastDetectedMachineDetails[component]);
                }
            }

            // Retain the production bar state
            updateProductionBarUI(lastDetectedMachineDetails);
        }
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
const registeredMarkers = ['machine1-marker', 'machine2-marker','machine3-marker', 'machine4-marker'];
registeredMarkers.forEach(markerId => {
    const markerElement = document.getElementById(markerId);
    if (markerElement) {
        markerElement.addEventListener('markerFound', () => handleMarkerDetection(markerId));
        markerElement.addEventListener('markerLost', () => handleMarkerLoss(markerId));
    }
});

// TIME .............................................................................................................................................

async function initTime(macAddress) {
    console.log("Initializing time with MAC Address:", macAddress);

    // Fetch machine data
    const machineData = await fetchMachineData(macAddress);
    console.log("Fetched machine data:", machineData);

    if (!machineData || typeof machineData !== "object" || !machineData.rescode) {
        console.error("Invalid machine data or missing rescode:", machineData);
        console.log("Initialization aborted.");
        return;
    }

    const resCode = machineData.rescode;
    console.log("Initializing time with rescode:", resCode);

    try {
        // Fetch productive date
        const productiveDateAps = await fetch(
            `https://intelcalc.apps.intelbras.com.br/v1/resources/${resCode}/aps/calendar/productive?date=${new Date().toISOString()}`
        );

        if (productiveDateAps.ok) {
            const data = await productiveDateAps.json();

            console.log("Productive data fetched:", data);

            const timeDetails = {
                dateStart: data?.data?.dateStart,
                dateEnd: data?.data?.dateEnd,
            };

            const startDate = new Date(timeDetails.dateStart);
            const endDate = timeDetails.dateEnd ? new Date(timeDetails.dateEnd) : new Date();
            const operationTime = (endDate - startDate) / 60000;

            const hours = Math.floor(operationTime / 60);
            const minutes = Math.floor(operationTime % 60);
            const duration = hours > 0 ? `${hours} h` : `${minutes} min`;

            console.log(`The machine operated for ${duration}.`);

            const hoursElement = document.getElementById("hours");
            if (hoursElement) {
                hoursElement.setAttribute("value", duration);
            } else {
                console.error("Element with id 'hours' not found.");
            }

            return timeDetails;
        } else {
            console.error("Failed to fetch productive data:", productiveDateAps.status);
        }
    } catch (error) {
        console.error("Error while processing productive data:", error);
    }
}


// STATUS MACHINE ............................................................................................................................

async function updateMachineStatus(status, stopDetails, machineDetails) {

	// PRODUÇÃO
	if (status === "PRODUCTION") {
		console.log("Entrou em produção");

		document.getElementById("grandbox").setAttribute("color", "#00a335");
		document.getElementById("status").setAttribute("value", "PRODUCAO");

		if (!machineDetails.orders) {
			document.getElementById("item").setAttribute("value", "sem item");
			const elementsToHide = [
				"cycletime", "operationcode", "quantity", "quantityprod",
				"scrapquantity", "perf", "goodquantity", "calcProdNum", 
				"tc", "op", "qtd", "qtdboa", "qtdprod", "ref", "itemtool", "nextop", "statusPercentage"
			];
			for (const id of elementsToHide) {
				const element = document.getElementById(id);
				if (element) element.setAttribute("visible", "false");
			}
		}
		updateMachineDataUI(machineDetails);
	}

	// PARADO
	if (status === "STOP" ) {
		console.log("Entrou em parada");

		document.getElementById("grandbox").setAttribute("color", `#${stopDetails.color || '00a335'}`);        
		document.getElementById("status").setAttribute("value", "PARADO");
		document.getElementById("item").setAttribute("value", stopDetails.name);

		if (!machineDetails.orders) {
			// Parado sem ordem
			console.log("Entrou em parado sem ordem");

			document.getElementById("grandbox").setAttribute("color", `#${stopDetails.color || '00a335'}`);
			document.getElementById("status").setAttribute("value", "PARADO");
			document.getElementById("tc").setAttribute("value", stopDetails.name);

			const elementsToHide = [ "cycletime", "operationcode", "quantity", "quantityprod", "scrapquantity", "perf", "goodquantity", "calcProdNum", "tc", "op", "qtd", "qtdboa", "qtdprod", "ref", "itemtool", "nextop", "statusPercentage", "lineI", "lineII"  ];
			for (const id of elementsToHide) {
				const element = document.getElementById(id);
				if (element) element.setAttribute("visible", "false");
			}
		}
		if (stopDetails.color === "CBDEE8") {
			document.getElementById("grandbox").setAttribute("color", "#4f5a61")
		}
		if (stopDetails.color === "FFCC47") {
			document.getElementById("grandbox").setAttribute("color", "#f5c207")
		}
		updateMachineDataUI(machineDetails);
	} 

	// INATIVO
	if (status === "INACTIVE") {
		console.log("Entrou em inativo");

		const elementsToHide = [  "cycletime", "operationcode", "quantity", "quantityprod", "scrapquantity", "perf", "goodquantity", "calcProdNum", "tc", "op", "qtd", "qtdboa", "qtdprod", "ref"  ];
		document.getElementById("grandbox").setAttribute("color", "#4f5a61");
		document.getElementById("status").setAttribute("value", "INATIVO");
		document.getElementById("item").setAttribute("value", "FORA DE TURNO: MAQUINA DESLIGADA PLANEJADA");
		for (const id of elementsToHide) {
			const element = document.getElementById(id);
			if (element) element.setAttribute("visible", "false");
		}
		updateMachineDataUI(machineDetails);
	}

	// INICIO DE OP - TESTAR
	if(statusPercentage >= 0 && statusPercentage <= 5){
	    document.getElementById("grandbox").setAttribute("color", `#${stopDetails.color || '00a335'}`);
	    document.getElementById("status").setAttribute("value", "INICIO DE OP"); //pode ser "INICIO DE OP" OU "TROCA DE OP"
	    // document.getElementById("item").setAttribute("value", stopDetails.name);
	    updateMachineDataUI(machineDetails);
	}

	// TROCA DE OP - TESTAR
	if(statusPercentage > 95){
	    document.getElementById("grandbox").setAttribute("color", `#${stopDetails.color || '00a335'}`);        
	    document.getElementById("status").setAttribute("value", "TROCA DE OP"); //pode ser "INICIO DE OP" OU "TROCA DE OP"
	    updateMachineDataUI(machineDetails);
	}
}