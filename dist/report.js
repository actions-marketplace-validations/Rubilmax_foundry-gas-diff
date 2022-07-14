import * as fs from "fs";
const BASE_TX_COST = 21000;
export const variation = (current, previous) => {
    return {
        value: current,
        delta: current - previous,
        prcnt: (100 * (current - previous)) / (previous - BASE_TX_COST),
    };
};
export const loadReports = (src) => {
    const content = fs.readFileSync(src, "utf8");
    const lines = content.split("\n");
    const reportHeaderIndexes = lines
        .map((line, index) => ({ isHeader: line.startsWith("╭"), index }))
        .filter(({ isHeader }) => isHeader)
        .map(({ index }) => index);
    return Object.fromEntries(reportHeaderIndexes
        .map((reportHeaderIndex) => lines
        .slice(reportHeaderIndex + 1, reportHeaderIndex +
        lines.slice(reportHeaderIndex).findIndex((line) => line.startsWith("╰")))
        .filter((line) => !line.startsWith("├") && !line.startsWith("╞")))
        .map((reportLines) => {
        const [deploymentCost, deploymentSize] = reportLines[2].match(/\d+/g) || [];
        if (!deploymentCost || !deploymentSize)
            throw Error("No depoyment cost or deployment size found. Is this a Foundry gas report?");
        return {
            name: reportLines[0].split(" ")[1],
            deploymentCost: parseFloat(deploymentCost),
            deploymentSize: parseFloat(deploymentSize),
            functions: Object.fromEntries(reportLines
                .slice(4)
                .map((line) => {
                const [method, min, avg, median, max, calls] = line.split("┆");
                return {
                    method: method.split(" ")[1],
                    min: parseFloat(min),
                    avg: parseFloat(avg),
                    median: parseFloat(median),
                    max: parseFloat(max),
                    calls: parseFloat(calls),
                };
            })
                .map((functionReport) => [functionReport.method, functionReport])),
        };
    })
        .map((report) => [report.name, report]));
};
export const computeDiff = (sourceReports, compareReports) => {
    const sourceReportNames = Object.keys(sourceReports);
    const commonReportNames = Object.keys(compareReports).filter((name) => sourceReportNames.includes(name));
    return commonReportNames
        .flatMap((reportName) => Object.values(sourceReports[reportName].functions).map((functionReport) => ({
        contract: reportName,
        method: functionReport.method,
        min: variation(compareReports[reportName].functions[functionReport.method].min, sourceReports[reportName].functions[functionReport.method].min),
        avg: variation(compareReports[reportName].functions[functionReport.method].avg, sourceReports[reportName].functions[functionReport.method].avg),
        median: variation(compareReports[reportName].functions[functionReport.method].median, sourceReports[reportName].functions[functionReport.method].median),
        max: variation(compareReports[reportName].functions[functionReport.method].max, sourceReports[reportName].functions[functionReport.method].max),
    })))
        .filter((row) => row.min.delta !== 0 || row.avg.delta !== 0 || row.median.delta !== 0 || row.max.delta !== 0);
};
//# sourceMappingURL=report.js.map