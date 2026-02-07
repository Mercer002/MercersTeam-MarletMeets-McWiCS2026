import math

class MatchingEngine:
    def __init__(self):
        #weights defined
        self.WEIGHT_PROXIMITY = 0.5
        self.WEIGHT_SKILLS = 0.3
        self.WEIGHT_LANGUAGE = 0.2

    def harvesine_distance(self, lat1, lon1, lat2, lon2):
        """
        calculate the great circle distance between two points on the earth (specificed in decimal degrees)
        """
        #convert decimals to degree radians
        lat1, lon1, lat2, lon2 = map(math.radians, [float(lat1), float(lon1), float(lat2), float(lon2)])

        # Haversine formula
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        r = 6371  # Radius of earth in kilometers
        return c * r
    
    def calculate_score(self, senior, student):
        """
        returns a compatability score between 0 and 100
        """

        #1. Proximity Score (50%)
        # start at 100, lose 10 points for every km away
        # if distance > 10 km, score is 0
        dist = self.harvesine_distance(
            senior['latitude'], senior['longitude'],
            student['latitude'], student['longitude']
        )
        proximity_score = max(0, 100 - (dist*10))

        #2. Skills Score (30%)
        #What % of senior's needs does the student have?
        senior_needs = set(senior.get('needs', []))
        student_skills = set(student.get('skills', []))

        if not senior_needs:
            skills_score = 100 #if senior needs nothing, everyone is perfect
        else:
            matches = senior_needs.intersection(student_skills)
            skills_score = (len(matches) / len(senior_needs)) * 100

        #3. Language Score (20%)
        #do they share any common language
        senior_langs = set(senior.get('languages', []))
        student_langs = set(student.get('languages', []))

        common_langs = senior_langs.intersection(student_langs)
        language_score = 100 if common_langs else 0

        #final weighted score
        total_score = (
            (proximity_score * self.WEIGHT_PROXIMITY) + 
            (skills_score * self.WEIGHT_SKILLS) + 
            (language_score * self.WEIGHT_LANGUAGE)
        )

        return {
            "student_id": student['student_id'], 
            "name": f"{student.get('first_name')} {student.get('last_name')}",
            "total_score": round(total_score, 1),
            "distance_km": round(dist, 2),
            "common_skills": list(senior_needs.intersection(student_skills))
        }
    
    def find_matches(self, senior, all_students, limit=3):
        """
        Returns the top N matches for a senior
        """
        scored_students = []
        for student in all_students:
            score_data = self.calculate_score(senior, student)
            scored_students.append(score_data)

        # Sort by total_score (Highest first)
        scored_students.sort(key=lambda x: x['total_score'], reverse=True)
        
        return scored_students[:limit]


