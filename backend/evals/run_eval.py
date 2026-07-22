import json
import sys
import time
import re
from pathlib import Path
from typing import Any


# This adds the backend root folder to Python's import path.
# It allows this file to import app.rag_service.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.rag_service import ask_question


EVALS_DIRECTORY = Path(__file__).resolve().parent
DATASET_PATH = EVALS_DIRECTORY / "eval_dataset.json"
RESULTS_DIRECTORY = EVALS_DIRECTORY / "results"

DOCUMENT_ID = "21897263-44f6-44ed-b7b0-410464baf828"

def load_eval_dataset() -> list[dict[str, Any]]:
    """
    Load evaluation questions from eval_dataset.json.
    """

    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Evaluation dataset was not found: {DATASET_PATH}"
        )

    with DATASET_PATH.open("r", encoding="utf-8") as file:
        dataset = json.load(file)

    if not isinstance(dataset, list):
        raise ValueError(
            "eval_dataset.json must contain a JSON list."
        )

    if not dataset:
        raise ValueError(
            "eval_dataset.json is empty."
        )

    for index, test_case in enumerate(dataset, start=1):
        if not isinstance(test_case, dict):
            raise ValueError(
                f"Test case {index} must be a JSON object."
            )

        required_fields = {
            "id",
            "category",
            "difficulty",
            "question",
            "answerable",
            "expected_answer",
            "expected_keywords",
            "expected_pages",
        }

        missing_fields = required_fields - test_case.keys()

        if missing_fields:
            raise ValueError(
                f"Test case {index} is missing fields: "
                f"{sorted(missing_fields)}"
            )

    return dataset


def get_retrieved_pages(
    retrieved_chunks: list[dict[str, Any]],
) -> list[int]:
    """
    Extract page numbers from the chunks returned by ask_question().
    """

    retrieved_pages = []

    for chunk in retrieved_chunks:
        metadata = chunk.get("metadata", {})
        page_number = metadata.get("page_number")

        if isinstance(page_number, int):
            retrieved_pages.append(page_number)

        elif isinstance(page_number, str) and page_number.isdigit():
            retrieved_pages.append(int(page_number))

    return retrieved_pages


def check_retrieval(
    expected_pages: list[int],
    retrieved_pages: list[int],
) -> bool:
    """
    Pass if at least one expected page appears in the retrieved pages.
    """

    if not expected_pages:
        return False

    for expected_page in expected_pages:
        if expected_page in retrieved_pages:
            return True

    return False

def normalize_text(text: str) -> str:
    """
    Lowercase text and remove punctuation.
    """
    return " ".join(
        re.findall(r"[a-z0-9']+", text.lower())
    )


def keyword_matches(
    keyword: str,
    answer: str,
) -> bool:
    """
    Check whether a keyword or phrase is represented in the answer.
    """
    normalized_keyword = normalize_text(keyword)
    normalized_answer = normalize_text(answer)

    # First try an exact phrase match.
    if normalized_keyword in normalized_answer:
        return True

    # Otherwise, check whether most words in the phrase appear.
    keyword_words = normalized_keyword.split()

    if not keyword_words:
        return False

    matched_words = 0

    for word in keyword_words:
        if word in normalized_answer:
            matched_words += 1

    match_ratio = matched_words / len(keyword_words)

    return match_ratio >= 0.75


def check_expected_keywords(
    answer: str,
    expected_keywords: list[str],
    minimum_ratio: float = 0.6,
) -> tuple[bool, float, list[str]]:
    """
    Pass if enough expected keywords are represented in the answer.

    Returns:
        passed
        score
        matched_keywords
    """

    if not expected_keywords:
        return False, 0.0, []

    matched_keywords = []

    for keyword in expected_keywords:
        if keyword_matches(keyword, answer):
            matched_keywords.append(keyword)

    score = len(matched_keywords) / len(expected_keywords)
    passed = score >= minimum_ratio

    return passed, score, matched_keywords

def run_test_case(
    test_case: dict[str, Any],
) -> dict[str, Any]:
    """
    Run one evaluation question through the RAG system.
    """
    REFUSAL_PHRASES = [
        "could not find that information",
        "couldn't find that information",
        "does not provide that information",
        "does not contain that information",
        "not found in the document",
        "insufficient information",
        "not enough information",
    ]

    def check_refusal(answer: str) -> bool:
        """
        Return True when the model clearly refuses an unsupported question.
        """

        normalized_answer = answer.lower()

        for phrase in REFUSAL_PHRASES:
            if phrase in normalized_answer:
                return True

        return False

    question = test_case["question"]
    document_id = DOCUMENT_ID
    answerable = test_case["answerable"]

    start_time = time.perf_counter()

    rag_result = ask_question(
        question=question,
        document_id=document_id,
        include_debug=True,
    )

    latency_seconds = time.perf_counter() - start_time

    generated_answer = rag_result["answer"]
    sources = rag_result.get("sources", [])
    retrieved_chunks = rag_result.get(
        "retrieved_chunks",
        [],
    )

    retrieved_pages = get_retrieved_pages(
        retrieved_chunks
    )

    expected_pages = test_case.get(
        "expected_pages",
        [],
    )

    expected_keywords = test_case.get(
        "expected_keywords",
        [],
    )

    if answerable:
        if expected_pages:
            retrieval_passed = check_retrieval(
                expected_pages=expected_pages,
                retrieved_pages=retrieved_pages,
            )
        else:
            retrieval_passed = None

        (
            answer_passed,
            answer_score,
            matched_keywords,
        ) = check_expected_keywords(
            answer=generated_answer,
            expected_keywords=expected_keywords,
        )

        refusal_passed = None

    else:
        retrieval_passed = None
        answer_passed = None
        answer_score = None
        matched_keywords = []

        refusal_passed = check_refusal(
            generated_answer
        )

    return {
        "id": test_case["id"],
        "category": test_case.get("category"),
        "difficulty": test_case.get("difficulty"),
        "question": question,
        "document_id": document_id,
        "answerable": answerable,
        "expected_answer": test_case.get(
            "expected_answer"
        ),
        "expected_keywords": expected_keywords,
        "expected_pages": expected_pages,
        "generated_answer": generated_answer,
        "retrieved_pages": retrieved_pages,
        "sources": sources,
        "retrieved_chunks": retrieved_chunks,
        "retrieval_passed": retrieval_passed,
        "answer_passed": answer_passed,
        "answer_score": answer_score,
        "matched_keywords": matched_keywords,
        "refusal_passed": refusal_passed,
        "latency_seconds": round(
            latency_seconds,
            3,
        ),
    }


def calculate_percentage(
    passed: int,
    total: int,
) -> float:
    """
    Convert passed/total into a percentage.
    """

    if total == 0:
        return 0.0

    return passed / total * 100


def print_test_result(
    result: dict[str, Any],
) -> None:
    """
    Print the result of one test case.
    """

    print(f"\nQuestion: {result['question']}")
    print(
        f"Generated answer: "
        f"{result['generated_answer']}"
    )
    print(
        f"Expected pages: "
        f"{result['expected_pages']}"
    )
    print(
        f"Retrieved pages: "
        f"{result['retrieved_pages']}"
    )

    if result["answerable"]:
        print(
            f"Retrieval passed: "
            f"{result['retrieval_passed']}"
        )
        print(
            f"Answer passed: "
            f"{result['answer_passed']}"
        )
    else:
        print(
            f"Refusal passed: "
            f"{result['refusal_passed']}"
        )

    print(
        f"Latency: "
        f"{result['latency_seconds']} seconds"
    )


def print_summary(
    results: list[dict[str, Any]],
) -> None:
    """
    Print the overall evaluation scores.
    """

    successful_results = [
        result
        for result in results
        if "error" not in result
    ]

    answerable_results = [
        result
        for result in successful_results
        if result["answerable"]
    ]

    unanswerable_results = [
        result
        for result in successful_results
        if not result["answerable"]
    ]

    retrieval_passes = sum(
        result["retrieval_passed"] is True
        for result in answerable_results
    )

    answer_passes = sum(
        result["answer_passed"] is True
        for result in answerable_results
    )

    refusal_passes = sum(
        result["refusal_passed"] is True
        for result in unanswerable_results
    )

    retrieval_score = calculate_percentage(
        retrieval_passes,
        len(answerable_results),
    )

    answer_score = calculate_percentage(
        answer_passes,
        len(answerable_results),
    )

    refusal_score = calculate_percentage(
        refusal_passes,
        len(unanswerable_results),
    )

    average_latency = 0.0

    if successful_results:
        total_latency = sum(
            result["latency_seconds"]
            for result in successful_results
        )

        average_latency = (
            total_latency / len(successful_results)
        )

    failed_tests = len(results) - len(successful_results)

    print("\n")
    print("=" * 60)
    print("RAG EVALUATION SUMMARY")
    print("=" * 60)

    print(f"Total tests: {len(results)}")
    print(
        f"Answerable tests: "
        f"{len(answerable_results)}"
    )
    print(
        f"Unanswerable tests: "
        f"{len(unanswerable_results)}"
    )
    print(f"Tests with errors: {failed_tests}")

    print(
        f"\nRetrieval Hit Rate@4: "
        f"{retrieval_passes}/"
        f"{len(answerable_results)} "
        f"({retrieval_score:.1f}%)"
    )

    print(
        f"Answer keyword accuracy: "
        f"{answer_passes}/"
        f"{len(answerable_results)} "
        f"({answer_score:.1f}%)"
    )

    print(
        f"Refusal accuracy: "
        f"{refusal_passes}/"
        f"{len(unanswerable_results)} "
        f"({refusal_score:.1f}%)"
    )

    print(
        f"Average latency: "
        f"{average_latency:.2f} seconds"
    )

    print("=" * 60)


def save_results(
    results: list[dict[str, Any]],
) -> Path:
    """
    Save the complete results to a timestamped JSON file.
    """

    RESULTS_DIRECTORY.mkdir(
        parents=True,
        exist_ok=True,
    )

    timestamp = time.strftime(
        "%Y%m%d-%H%M%S"
    )

    output_path = (
        RESULTS_DIRECTORY
        / f"eval_results_{timestamp}.json"
    )

    with output_path.open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            results,
            file,
            indent=2,
            ensure_ascii=False,
        )

    return output_path


def run_evaluation() -> None:
    """
    Run every question in the evaluation dataset.
    """

    dataset = load_eval_dataset()
    results = []

    print(
        f"Running {len(dataset)} evaluation tests..."
    )

    for index, test_case in enumerate(
        dataset,
        start=1,
    ):
        test_id = test_case.get(
            "id",
            f"test_{index}",
        )

        print("\n" + "-" * 60)
        print(
            f"[{index}/{len(dataset)}] "
            f"Running {test_id}"
        )

        try:
            result = run_test_case(test_case)
            print_test_result(result)

        except Exception as error:
            result = {
                "id": test_id,
                "question": test_case.get(
                    "question"
                ),
                "error": str(error),
            }

            print(f"Test failed with error: {error}")

        results.append(result)

    print_summary(results)

    output_path = save_results(results)

    print(f"\nDetailed results saved to:")
    print(output_path)


if __name__ == "__main__":
    run_evaluation()