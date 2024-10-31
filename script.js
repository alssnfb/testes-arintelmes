const qrCodeResponse = 'D0:EF:76:45:ED:DF'
const components = ["cycletime", "operationcode", "quantity", "quantityprod", "scrapquantity", "goodquantity", "perf", "nextop", "rescode", "itemtool", "item"];
 
if (qrCodeResponse) {
    const intelmountAPIResponse = await fetch(`https://intelmount.apps.intelbras.com.br/v1/resources/mount?mac=${qrCodeResponse}`)
    
 
    if (intelmountAPIResponse) {
        const data = await intelmountAPIResponse?.json();
        console.log(data?.data?.[0].code, data?.data[0]?.orders?.currents[0]?.operationId)
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
        }
 
        if (data) {
            for (const component of components) {
                const element = document.getElementById(component);
                element.setAttribute("value", machineDetails[component]);
            }
        }
 
    }
}    
 