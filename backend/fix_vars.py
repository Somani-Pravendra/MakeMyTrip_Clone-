with open('controllers/bookingController.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('["$this.status"', '["$$this.status"')
content = content.replace('["$this.checkIn"', '["$$this.checkIn"')
content = content.replace('["$this.checkOut"', '["$$this.checkOut"')
content = content.replace('in: "$r.roomCount"', 'in: "$$r.roomCount"')

with open('controllers/bookingController.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
