const jokeElement = document.querySelector("#joke");
const statusElement = document.querySelector("#status");
const button = document.querySelector("#joke-button");

async function getJoke() {
  button.disabled = true;
  button.classList.add("is-loading");
  button.querySelector("span:first-child").textContent = "Finding a joke…";
  statusElement.textContent = "Asking the joke experts…";
  jokeElement.textContent = "A moment, please.";

  try {
    const response = await fetch("https://icanhazdadjoke.com/", {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Joke service returned ${response.status}`);
    }

    const data = await response.json();
    if (!data.joke) {
      throw new Error("The joke service returned an empty joke.");
    }

    jokeElement.textContent = data.joke;
    statusElement.textContent = "Did that get a chuckle? Go on, try another.";
  } catch (error) {
    console.error("Could not load a joke:", error);
    jokeElement.textContent = "Our joke supply took a little break.";
    statusElement.textContent = "Check your internet connection and give it another try.";
  } finally {
    button.disabled = false;
    button.classList.remove("is-loading");
    button.querySelector("span:first-child").textContent = "Another one";
  }
}

button.addEventListener("click", getJoke);
