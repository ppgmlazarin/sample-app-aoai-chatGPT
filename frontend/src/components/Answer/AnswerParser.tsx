import { AskResponse, Citation } from "../../api";
import { cloneDeep } from "lodash-es";


type ParsedAnswer = {
    citations: Citation[];
    markdownFormatText: string;
};

const enumerateCitations = (citations: Citation[]) => {
    const filepathMap = new Map();
    for (const citation of citations) {
        const { filepath } = citation;
        let part_i = 1
        if (filepathMap.has(filepath)) {
            part_i = filepathMap.get(filepath) + 1;
        }
        filepathMap.set(filepath, part_i);
        citation.part_index = part_i;
    }
    return citations;
}

const setHyperLink = (answer: string) => {
    if (answer.includes('KA') && answer.length <= 3) {
        return answer;
    }

    if (!answer.includes('KA') && isNaN(+answer)) {
        return answer;
    }

    if (!isNaN(+answer) && answer.length < 4) {
        return answer;
    }

    if (answer.includes('KA')) {
        if (isNaN(+answer[2])) {
            answer = answer.substring(3, answer.length);
        } else {
            answer = answer.substring(2, answer.length);
        }
    }
    return `[${answer}](https://ppgprod.alembacloud.com/production/Portal.aspx?&TemplateName=LiteKnowledgeSearchResults&BTN_SELECT${answer}=View)`
}

export function parseAnswer(answer: AskResponse): ParsedAnswer {
    let answerText = answer.answer;

    answerText = answerText.split(' ').map(e => {
        return setHyperLink(e);
    }).join(' ');

    const citationLinks = answerText.match(/\[(doc\d\d?\d?)]/g);

    const lengthDocN = "[doc".length;

    let filteredCitations = [] as Citation[];
    let citationReindex = 0;
    citationLinks?.forEach(link => {
        // Replacing the links/citations with number
        let citationIndex = link.slice(lengthDocN, link.length - 1);
        let citation = cloneDeep(answer.citations[Number(citationIndex) - 1]) as Citation;
        if (!filteredCitations.find((c) => c.id === citationIndex) && citation) {
          answerText = answerText.replaceAll(link, ` ^${++citationReindex}^ `);
          citation.id = citationIndex; // original doc index to de-dupe
          citation.reindex_id = citationReindex.toString(); // reindex from 1 for display
          filteredCitations.push(citation);
        }
    })

    filteredCitations = enumerateCitations(filteredCitations);

    return {
        citations: filteredCitations,
        markdownFormatText: answerText
    };
}
