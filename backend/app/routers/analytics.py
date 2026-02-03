from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, database
from .auth import get_current_user
import json
from datetime import datetime

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/user")
def get_user_analytics(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    interviews = db.query(models.Interview).filter(
        models.Interview.user_id == current_user.id,
        models.Interview.status == "COMPLETED"
    ).all()
    
    if not interviews:
        return {
            "total_interviews": 0,
            "avg_score": 0,
            "history": [],
            "role_stats": [],
            "skill_radar": []
        }
        
    history_data = []
    role_map = {}
    skill_metrics = {
        "technical": {"total": 0, "count": 0},
        "communication": {"total": 0, "count": 0},
        "problem_solving": {"total": 0, "count": 0},
        "confidence": {"total": 0, "count": 0}
    }
    
    total_score_sum = 0
    
    for inv in interviews:
        if not inv.feedback_result:
            continue
            
        try:
            feedback = json.loads(inv.feedback_result)
            score = feedback.get("score", 0)
            
            # Skip interviews with 0 score (incomplete/test sessions)
            if score == 0:
                continue
                
            metrics = feedback.get("metrics", {})
            
            # 1. Parse Role from Job Description
            # Expected format: "TARGET COMPANY: ... \nJOB POSITION: Role Name \n..."
            role = "General"
            if inv.job_description:
                lines = inv.job_description.split('\n')
                for line in lines:
                    if "JOB POSITION:" in line:
                        role = line.split("JOB POSITION:")[1].strip()
                        break
            
            # Use dynamic role directly (Title Case)
            # Truncate if too long to keep charts clean
            category = role.split('(')[0].strip().title()
            if len(category) > 20:
                category = category[:17] + "..."
                
            # Date Formatting
            date_str = inv.created_at
            try:
                date_obj = datetime.fromisoformat(date_str)
                display_date = date_obj.strftime("%b %d")
            except:
                display_date = "Unknown"
                
            # Add to History
            history_data.append({
                "date": display_date,
                "score": score,
                "role": category,
                "title": role
            })
            
            # Role Aggregation
            if category not in role_map:
                role_map[category] = {"total": 0, "count": 0}
            role_map[category]["total"] += score
            role_map[category]["count"] += 1
            
            # Skill Aggregation
            for key in skill_metrics:
                if key in metrics:
                    skill_metrics[key]["total"] += metrics[key]
                    skill_metrics[key]["count"] += 1
            
            total_score_sum += score
            
        except Exception as e:
            print(f"Error processing analytics for interview {inv.id}: {e}")
            continue
            
    # Final Calculations
    history_data.sort(key=lambda x: x['date']) # Basic sort, might need refinement if dates same
    
    avg_score = round(total_score_sum / len(interviews)) if interviews else 0
    
    role_stats = []
    for role, data in role_map.items():
        role_stats.append({
            "name": role,
            "score": round(data["total"] / data["count"])
        })
        
    skill_radar = []
    for skill, data in skill_metrics.items():
        if data["count"] > 0:
            skill_radar.append({
                "subject": skill.replace("_", " ").title(),
                "A": round(data["total"] / data["count"]),
                "fullMark": 100
            })
            
    return {
        "total_interviews": len(interviews),
        "avg_score": avg_score,
        "history": history_data,
        "role_stats": role_stats,
        "skill_radar": skill_radar
    }
