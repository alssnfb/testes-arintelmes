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

async function fetchMachineData() {
    const qrCodeResponse = 'D0:EF:76:45:ED:DF'; 
    const components = ["cycletime", "operationcode", "quantity", "quantityprod", "scrapquantity", "goodquantity", "perf", "nextop", "rescode", "itemtool", "item"];

    try {
        if (qrCodeResponse) {
            const intelmountAPIResponse = await fetch(`https://intelmount.apps.intelbras.com.br/v1/resources/mount?mac=${qrCodeResponse}`);

            if (intelmountAPIResponse.ok) {
                const data = await intelmountAPIResponse.json();

                console.log(data?.data?.[0].code, data?.data[0]?.orders?.currents[0]?.operationId);

                const machineDetails = {
                    cycletime: data?.data[0]?.orders?.currents[0]?.item?.factor,
                    operationcode: data?.data[0]?.orders?.currents[0]?.operationId,
                    quantity: data?.data[0]?.orders?.currents[0]?.production?.meta,
                    quantityprod: data?.data[0]?.orders?.currents[0]?.production?.current,
                    scrapquantity: data?.data[0]?.orders?.currents[0]?.production?.refuge,
                    goodquantity: data?.data[0]?.orders?.currents[0]?.production?.current - data?.data[0]?.orders?.currents[0]?.production?.refuge,
                    perf: data?.data[0]?.orders?.currents[0]?.perf,
                    nextop: "5607040-2",
                    rescode: data?.data?.[0].code,
                    itemtool: data?.data[0]?.orders?.currents[0]?.item?.tool,
                    item: `${data?.data[0]?.orders?.currents[0]?.item?.code} - ${data?.data[0]?.orders?.currents[0]?.item?.name}`
                };

                for (const component of components) {
                    const element = document.getElementById(component);
                    if (element) {
                        element.setAttribute("value", machineDetails[component]);
                    }
                }
            } else {
                console.log('Failed to fetch data from the API', intelmountAPIResponse.status);
            }
        }
    } catch (error) {
        console.error('Não foi possível se conectar à API', error);
    }
}


// fetchMachineData();

