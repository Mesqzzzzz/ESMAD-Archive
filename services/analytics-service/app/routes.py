from flask import Blueprint, jsonify, request

analytics_bp = Blueprint('analytics', __name__)

analytics_data = [
    {"id": 1, "metric": "visits", "value": 120},
    {"id": 2, "metric": "projects_created", "value": 15}
]

@analytics_bp.route('/', methods=['GET'])
def get_all():
    return jsonify(analytics_data)

@analytics_bp.route('/<int:id>', methods=['GET'])
def get_by_id(id):
    item = next((a for a in analytics_data if a["id"] == id), None)
    if not item:
        return jsonify({"error": "Item not found"}), 404
    return jsonify(item)

@analytics_bp.route('/', methods=['POST'])
def create_item():
    data = request.get_json()
    new_id = max([a["id"] for a in analytics_data]) + 1
    new_item = {"id": new_id, **data}
    analytics_data.append(new_item)
    return jsonify(new_item), 201
