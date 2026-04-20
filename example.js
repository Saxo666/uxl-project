const exampleCode = `state count = 0
state step = 1
state name = "Guest"
state is_admin = false
state total = 0

total = count * step

text "Counter Application"
text "Hello {name}"
text "Count: {count}"
text "Step: {step}"
text "Computed total: {total}"

input name
input step

button "Increase":
    onClick => count = count + step

button "Decrease":
    onClick => count = count - step

if not is_admin and count >= 10:
    text "Guest users reached the warning zone"
elif count >= 5 and count < 10:
    text "Counter is warming up"
else:
    text "Counter is still calm"`;


document.getElementById("codeEditor").value = exampleCode;
