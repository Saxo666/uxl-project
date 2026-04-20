const exampleCode = `state price = 120.5
state qty = 2
state discount = 10
state total = 0

total = (price * qty) - discount

text "Calculator Demo"
text "Price: {price}"
text "Qty: {qty}"
text "Discount: {discount}"
text "Result: {total}"

input price
input qty
input discount

button "Add Qty":
    onClick => qty = qty + 1

button "Remove Qty":
    onClick => qty = qty - 1

if total >= 200:
    text "Large order"
elif total >= 100 and total < 200:
    text "Medium order"
else:
    text "Small order"`;

document.getElementById("codeEditor").value = exampleCode;
