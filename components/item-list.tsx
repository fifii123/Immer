import { Card, CardContent } from "@/components/ui/card"

const items = [
  { id: 1, name: "Item 1" },
  { id: 2, name: "Item 2" },
  { id: 3, name: "Item 3" },
  { id: 4, name: "Item 4" },
  { id: 5, name: "Item 5" },
]

export default function ItemList() {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="p-4">
            <p>{item.name}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

